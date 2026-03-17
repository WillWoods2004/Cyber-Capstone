import { deriveMasterKey, decryptEntry } from "../nk/sdk/dist/crypto.js";

const API = process.env.API_BASE ?? "http://localhost:8080";
const USERNAME = process.env.DEMO_USER ?? "nksf1-demo";
const PASSWORD = process.env.DEMO_PASSWORD ?? "CorrectHorseBatteryStaple!";

function ub64(value) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function request(path, init = {}) {
  const response = await fetch(`${API}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
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
  const setup = await request("/mfa/setup", {
    method: "POST",
    headers: { authorization: `Bearer ${challengeToken}` },
  });

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
  const { authToken, vaultProfile } = await authenticate();
  const list = await request("/vault/items", {
    headers: { authorization: `Bearer ${authToken}` },
  });

  const items = list.payload.items ?? [];
  if (!items.length) {
    throw new Error("No items in vault");
  }

  const latest = items[items.length - 1];
  const { key } = await deriveMasterKey(PASSWORD, {
    salt: ub64(vaultProfile.salt),
  });

  const plaintext = await decryptEntry(key, latest);
  console.log("Decrypted:", new TextDecoder().decode(plaintext));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
