import { deriveMasterKey, encryptEntry } from "../nk/sdk/dist/crypto.js";

const API = process.env.API_BASE ?? "http://localhost:8080";
const USERNAME = process.env.DEMO_USER ?? "nksf1-demo";
const PASSWORD = process.env.DEMO_PASSWORD ?? "CorrectHorseBatteryStaple!";

const decoder = new TextDecoder();

function ub64(value) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function request(path, init = {}) {
  const response = await fetch(`${API}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function ensureRegistered() {
  const { response } = await request("/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (![201, 409].includes(response.status)) {
    throw new Error(`Register failed with ${response.status}`);
  }
}

async function authenticate() {
  const login = await request("/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  if (!login.response.ok) {
    throw new Error(`Login failed: ${login.response.status}`);
  }

  const challengeToken = login.payload.challengeToken;
  if (!challengeToken) {
    throw new Error("Login response missing challenge token.");
  }

  const setup = await request("/mfa/setup", {
    method: "POST",
    headers: { authorization: `Bearer ${challengeToken}` },
  });

  if (!setup.response.ok) {
    throw new Error(`MFA setup failed: ${setup.response.status}`);
  }

  const verify = await request("/mfa/verify", {
    method: "POST",
    headers: {
      authorization: `Bearer ${challengeToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ code: setup.payload.mockCode ?? "123456" }),
  });

  if (!verify.response.ok) {
    throw new Error(`MFA verify failed: ${verify.response.status}`);
  }

  return {
    authToken: verify.payload.authToken,
    vaultProfile: verify.payload.vaultProfile,
  };
}

async function main() {
  await ensureRegistered();
  const { authToken, vaultProfile } = await authenticate();
  if (!authToken) {
    throw new Error("Auth token missing after MFA verify.");
  }

  const { key } = await deriveMasterKey(PASSWORD, {
    salt: ub64(vaultProfile.salt),
  });

  const plaintext = new TextEncoder().encode("demo-account:supersecret");
  const item = await encryptEntry(key, plaintext, {
    site: "demo.local",
    login: "demo-user",
  });

  const created = await request("/vault/items", {
    method: "POST",
    headers: {
      authorization: `Bearer ${authToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(item),
  });

  if (created.response.status !== 201) {
    throw new Error(`Create failed: ${created.response.status}`);
  }

  const list = await request("/vault/items", {
    headers: { authorization: `Bearer ${authToken}` },
  });

  console.log("Created item:", created.payload);
  console.log("Visible list:", JSON.stringify(list.payload, null, 2));
  console.log(
    "Summary:",
    decoder.decode(new TextEncoder().encode(`stored ${list.payload.items?.length ?? 0} ciphertext item(s)`))
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
