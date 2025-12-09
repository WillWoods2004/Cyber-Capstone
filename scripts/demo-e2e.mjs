import { deriveMasterKey, encryptEntry } from "../nk/sdk/dist/crypto.js";
const API = "http://localhost:8080";
const MPW = "CorrectHorseBatteryStaple!";
const b64  = (u) => Buffer.from(u).toString("base64");
async function main() {
  const { key, salt } = await deriveMasterKey(MPW);
  const item = await encryptEntry(key, new TextEncoder().encode("neelan:supersecret"), { label: "e2e", salt: b64(salt) });
  const created = await fetch(`${API}/vault/items`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) }).then(r => r.json());
  console.log("Created:", created);
  const list = await fetch(`${API}/vault/items`).then(r => r.json());
  console.log("List:", JSON.stringify(list, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
