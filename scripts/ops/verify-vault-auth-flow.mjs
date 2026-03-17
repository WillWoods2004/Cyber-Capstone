import { randomBytes } from "crypto";
import { deriveMasterKey, decryptEntry, encryptEntry } from "../../nk/sdk/dist/crypto.js";

const API = process.env.API_BASE ?? "http://localhost:8080";
const MFA_CODE = process.env.MOCK_MFA_CODE ?? "123456";

const ALICE = {
  username: "alice-nksf1",
  password: "CorrectHorseBatteryStaple!",
  rotatedPassword: "RotatedHorseBatteryStaple!",
};

const BOB = {
  username: "bob-nksf1",
  password: "CorrectHorseBatteryStaple!",
};

function ub64(value) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function b64(value) {
  return Buffer.from(value).toString("base64");
}

async function request(path, init = {}) {
  const response = await fetch(`${API}${path}`, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function registerUser(username, password) {
  const { response } = await request("/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (![201, 409].includes(response.status)) {
    throw new Error(`Register ${username} failed: ${response.status}`);
  }
}

async function authenticate(username, password) {
  const login = await request("/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!login.response.ok) {
    throw new Error(`Login ${username} failed: ${login.response.status}`);
  }

  const challengeToken = login.payload.challengeToken;
  if (!challengeToken) {
    throw new Error(`Login ${username} missing challenge token.`);
  }

  const setup = await request("/mfa/setup", {
    method: "POST",
    headers: { authorization: `Bearer ${challengeToken}` },
  });

  if (!setup.response.ok) {
    throw new Error(`MFA setup ${username} failed: ${setup.response.status}`);
  }

  const verify = await request("/mfa/verify", {
    method: "POST",
    headers: {
      authorization: `Bearer ${challengeToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ code: setup.payload.mockCode ?? MFA_CODE }),
  });

  if (!verify.response.ok) {
    throw new Error(`MFA verify ${username} failed: ${verify.response.status}`);
  }

  return {
    authToken: verify.payload.authToken,
    vaultProfile: verify.payload.vaultProfile,
  };
}

async function storeCipher(authToken, password, vaultProfile, site) {
  const { key } = await deriveMasterKey(password, {
    salt: ub64(vaultProfile.salt),
  });

  const plaintext = new TextEncoder().encode(`${site}:${password}`);
  const item = await encryptEntry(key, plaintext, {
    site,
    login: `${site}@example.com`,
    createdAt: new Date().toISOString(),
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
    throw new Error(`Create ${site} failed: ${created.response.status}`);
  }

  return created.payload;
}

async function main() {
  await registerUser(ALICE.username, ALICE.password);
  await registerUser(BOB.username, BOB.password);

  const alice = await authenticate(ALICE.username, ALICE.password);
  const bob = await authenticate(BOB.username, BOB.password);

  const aliceItem = await storeCipher(alice.authToken, ALICE.password, alice.vaultProfile, "alice.local");
  const bobItem = await storeCipher(bob.authToken, BOB.password, bob.vaultProfile, "bob.local");

  const aliceList = await request("/vault/items", {
    headers: { authorization: `Bearer ${alice.authToken}` },
  });
  const bobList = await request("/vault/items", {
    headers: { authorization: `Bearer ${bob.authToken}` },
  });

  if (!aliceList.payload.items?.some((item) => item.id === aliceItem.id)) {
    throw new Error("Alice cannot see her own vault item.");
  }

  if (aliceList.payload.items?.some((item) => item.id === bobItem.id)) {
    throw new Error("Alice can see Bob's vault item.");
  }

  if (!bobList.payload.items?.some((item) => item.id === bobItem.id)) {
    throw new Error("Bob cannot see his own vault item.");
  }

  const crossRead = await request(`/vault/items/${bobItem.id}`, {
    headers: { authorization: `Bearer ${alice.authToken}` },
  });
  if (crossRead.response.status !== 404) {
    throw new Error(`Cross-user read should be 404, got ${crossRead.response.status}.`);
  }

  const crossDelete = await request(`/vault/items/${bobItem.id}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${alice.authToken}` },
  });
  if (crossDelete.response.status !== 404) {
    throw new Error(`Cross-user delete should be 404, got ${crossDelete.response.status}.`);
  }

  const aliceItems = aliceList.payload.items ?? [];
  const { key: aliceOldKey } = await deriveMasterKey(ALICE.password, {
    salt: ub64(alice.vaultProfile.salt),
  });

  const nextSalt = b64(randomBytes(16));
  const { key: aliceNewKey } = await deriveMasterKey(ALICE.rotatedPassword, {
    salt: ub64(nextSalt),
  });

  const rotatedItems = [];
  for (const item of aliceItems) {
    const plaintext = await decryptEntry(aliceOldKey, item);
    const rotated = await encryptEntry(aliceNewKey, plaintext, {
      ...(item.meta ?? {}),
      rotatedAt: new Date().toISOString(),
    });
    rotated.id = item.id;
    rotatedItems.push(rotated);
  }

  const rotate = await request("/vault/rotate-key", {
    method: "POST",
    headers: {
      authorization: `Bearer ${alice.authToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      currentPassword: ALICE.password,
      newPassword: ALICE.rotatedPassword,
      newVaultSalt: nextSalt,
      items: rotatedItems,
    }),
  });

  if (!rotate.response.ok) {
    throw new Error(`Key rotation failed: ${rotate.response.status}`);
  }

  const staleLogin = await request("/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: ALICE.username, password: ALICE.password }),
  });
  if (staleLogin.response.status !== 401) {
    throw new Error(`Old password should fail after rotation, got ${staleLogin.response.status}.`);
  }

  const rotatedAlice = await authenticate(ALICE.username, ALICE.rotatedPassword);
  const rotatedList = await request("/vault/items", {
    headers: { authorization: `Bearer ${rotatedAlice.authToken}` },
  });

  if (!rotatedList.payload.items?.length) {
    throw new Error("Rotated account cannot see any vault items.");
  }

  const latest = rotatedList.payload.items[0];
  const { key: rotatedKey } = await deriveMasterKey(ALICE.rotatedPassword, {
    salt: ub64(rotatedAlice.vaultProfile.salt),
  });
  const decrypted = await decryptEntry(rotatedKey, latest);
  const text = new TextDecoder().decode(decrypted);

  console.log("Verified Alice/Bob isolation.");
  console.log("Verified key rotation and new login password.");
  console.log(`Latest Alice item decrypted after rotation: ${text}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
