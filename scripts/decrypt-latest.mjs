import { deriveMasterKey, decryptEntry } from "../nk/sdk/dist/crypto.js";
const API = "http://localhost:8080";
const MPW = "CorrectHorseBatteryStaple!";
const ub64 = (s) => new Uint8Array(Buffer.from(s, "base64"));
async function main() {
  const list = await fetch(`${API}/vault/items`).then(r => r.json());
  const items = list.items ?? [];
  if (!items.length) throw new Error("No items in vault");
  const latest = items[items.length - 1];
  const saltB64 = latest.meta?.salt;
  if (!saltB64) throw new Error("Item missing meta.salt");
  const { key } = await deriveMasterKey(MPW, { salt: ub64(saltB64) });
  const pt = await decryptEntry(key, latest);
  console.log("Decrypted:", new TextDecoder().decode(pt));
}
main().catch(e => { console.error(e); process.exit(1); });
