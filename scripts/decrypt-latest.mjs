import { deriveMasterKey, decryptEntry, ub64 } from "../nk/sdk/dist/crypto.js";

const API = "http://localhost:8080";

(async () => {
  const list = await (await fetch(`${API}/vault/items`)).json();
  if (!list.items?.length) throw new Error("No items in vault");
  const latest = list.items[list.items.length - 1];

  const saltB64 = latest?.meta?.salt;
  if (!saltB64) throw new Error("No salt in item.meta");
  const { key } = await deriveMasterKey("CorrectHorseBatteryStaple!", {
    salt: ub64(saltB64),
  });

  const clear = await decryptEntry(key, latest);
  console.log("Decrypted:", new TextDecoder().decode(clear));
})().catch((e) => { console.error(e); process.exit(1); });
