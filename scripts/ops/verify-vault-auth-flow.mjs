const API = (process.env.API_BASE ?? "http://localhost:8080").replace(/\/+$/, "");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  const hasJsonBody = options.body !== undefined && !headers.has("content-type");
  if (hasJsonBody) {
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

  const text = await response.text();
  let data = null;
  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { response, data };
}

async function registerAndAuthenticate(username, password) {
  const registerResult = await request("/register", {
    method: "POST",
    body: { username, password },
  });
  assert(registerResult.response.status === 201, `register failed for ${username}`);

  const loginResult = await request("/login", {
    method: "POST",
    body: { username, password },
  });
  assert(loginResult.response.status === 200, `login failed for ${username}`);
  assert(loginResult.data?.success === true, `login success flag missing for ${username}`);
  assert(typeof loginResult.data?.challengeToken === "string", `challenge token missing for ${username}`);

  const challengeToken = loginResult.data.challengeToken;

  const setupResult = await request("/mfa/setup", {
    method: "POST",
    headers: {
      authorization: `Bearer ${challengeToken}`,
    },
  });
  assert(setupResult.response.status === 200, `mfa setup failed for ${username}`);
  assert(typeof setupResult.data?.mockCode === "string", `mock MFA code missing for ${username}`);

  const verifyResult = await request("/mfa/verify", {
    method: "POST",
    headers: {
      authorization: `Bearer ${challengeToken}`,
    },
    body: {
      code: setupResult.data.mockCode,
    },
  });
  assert(verifyResult.response.status === 200, `mfa verify failed for ${username}`);
  assert(typeof verifyResult.data?.authToken === "string", `auth token missing for ${username}`);

  return verifyResult.data.authToken;
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const userOne = `nk-user-one-${suffix}`;
  const userTwo = `nk-user-two-${suffix}`;
  const password = "CorrectHorseBatteryStaple!";

  const authTokenOne = await registerAndAuthenticate(userOne, password);
  const authTokenTwo = await registerAndAuthenticate(userTwo, password);

  const createResult = await request("/vault/items", {
    method: "POST",
    headers: {
      authorization: `Bearer ${authTokenOne}`,
    },
    body: {
      id: `nk-auth-${suffix}`,
      ct: Buffer.from("ciphertext").toString("base64"),
      iv: Buffer.from("123456789012").toString("base64"),
      tag: Buffer.from("abcdefghijklmnop").toString("base64"),
      meta: {
        site: "vault.example",
        login: "nk-user-one@example.com",
        userId: "spoof-attempt",
      },
    },
  });
  assert(createResult.response.status === 201, "vault create failed for user one");
  assert(createResult.data?.id, "created item id missing");
  assert(createResult.data?.meta?.userId === undefined, "server should not echo client-supplied userId");

  const itemId = createResult.data.id;

  const listOne = await request("/vault/items", {
    headers: {
      authorization: `Bearer ${authTokenOne}`,
    },
  });
  assert(listOne.response.status === 200, "vault list failed for user one");
  assert(Array.isArray(listOne.data?.items), "vault list payload missing items array");
  assert(listOne.data.items.length === 1, "user one should see exactly one item");
  assert(listOne.data.items[0].id === itemId, "user one list did not return created item");

  const getOne = await request(`/vault/items/${encodeURIComponent(itemId)}`, {
    headers: {
      authorization: `Bearer ${authTokenOne}`,
    },
  });
  assert(getOne.response.status === 200, "user one should fetch owned item");

  const listTwo = await request("/vault/items", {
    headers: {
      authorization: `Bearer ${authTokenTwo}`,
    },
  });
  assert(listTwo.response.status === 200, "vault list failed for user two");
  assert(Array.isArray(listTwo.data?.items), "vault list payload missing items array for user two");
  assert(listTwo.data.items.length === 0, "user two should not see user one items");

  const getTwo = await request(`/vault/items/${encodeURIComponent(itemId)}`, {
    headers: {
      authorization: `Bearer ${authTokenTwo}`,
    },
  });
  assert(getTwo.response.status === 404, "user two should not fetch user one item");

  const deleteTwo = await request(`/vault/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${authTokenTwo}`,
    },
  });
  assert(deleteTwo.response.status === 404, "user two should not delete user one item");

  const deleteOne = await request(`/vault/items/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${authTokenOne}`,
    },
  });
  assert(deleteOne.response.status === 204, "user one delete failed");

  const listOneAfterDelete = await request("/vault/items", {
    headers: {
      authorization: `Bearer ${authTokenOne}`,
    },
  });
  assert(listOneAfterDelete.response.status === 200, "post-delete list failed for user one");
  assert(Array.isArray(listOneAfterDelete.data?.items), "post-delete items array missing");
  assert(listOneAfterDelete.data.items.length === 0, "user one vault should be empty after delete");

  const anonymousList = await request("/vault/items");
  assert(anonymousList.response.status === 401, "anonymous vault list should be rejected");

  console.log("Authenticated vault flow verified successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
