import { deriveMasterKey, encryptEntry, b64 } from "../nk/sdk/dist/crypto.js";

const API = "http://localhost:8080";

(async () => {
  const { key, salt } = await deriveMasterKey("CorrectHorseBatteryStaple!");
  const item = await encryptEntry(
    key,
    new TextEncoder().encode("neelan:supersecret"),
    { label: "e2e", salt: b64(salt) }
  );

  const res = await fetch(`${API}/vault/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`POST failed: ${res.status}`);
  const created = await res.json();
  console.log("Created:", created);

  const list = await (await fetch(`${API}/vault/items`)).json();
  console.log("List:", JSON.stringify(list, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
