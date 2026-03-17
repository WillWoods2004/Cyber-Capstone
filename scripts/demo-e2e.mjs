import { deriveMasterKey, encryptEntry, b64 } from "../nk/sdk/dist/crypto.js";

const API = (process.env.API_BASE ?? "http://localhost:8080").replace(/\/+$/, "");
const PASSWORD = process.env.VAULT_PASSWORD ?? "CorrectHorseBatteryStaple!";
const USERNAME = process.env.VAULT_USERNAME ?? `demo-${Date.now()}`;

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (options.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
    body:
      options.body !== undefined && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function authenticate(username, password) {
  await request("/register", {
    method: "POST",
    body: { username, password },
  }).catch(() => null);

  const login = await request("/login", {
    method: "POST",
    body: { username, password },
  });

  const setup = await request("/mfa/setup", {
    method: "POST",
    headers: {
      authorization: `Bearer ${login.challengeToken}`,
    },
  });

  const verify = await request("/mfa/verify", {
    method: "POST",
    headers: {
      authorization: `Bearer ${login.challengeToken}`,
    },
    body: {
      code: setup.mockCode,
    },
  });

  return verify.authToken;
}

async function main() {
  const authToken = await authenticate(USERNAME, PASSWORD);
  const { key, salt } = await deriveMasterKey(PASSWORD);
  const item = await encryptEntry(key, new TextEncoder().encode("neelan:supersecret"), {
    label: "e2e",
    salt: b64(salt),
  });

  const created = await request("/vault/items", {
    method: "POST",
    headers: {
      authorization: `Bearer ${authToken}`,
    },
    body: item,
  });

  console.log("Created:", created);

  const list = await request("/vault/items", {
    headers: {
      authorization: `Bearer ${authToken}`,
    },
  });

  console.log("List:", JSON.stringify(list, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
