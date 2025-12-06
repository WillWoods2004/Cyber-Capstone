import sodium from "libsodium-wrappers-sumo";

export type CipherBlob = {
  id?: string;
  ct: string; iv: string; tag: string;
  meta?: Record<string, unknown>;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64enc = (buf: ArrayBuffer) => {
  const u = new Uint8Array(buf); let s = ""; for (let i=0;i<u.length;i++) s += String.fromCharCode(u[i]); return btoa(s);
};
const b64dec = (b64: string) => {
  const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i); return u.buffer;
};

export function zeroize(arr?: ArrayBufferView | null) {
  if (!arr) return; new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength).fill(0);
}

// Argon2id  AES-256 key
export async function deriveMasterKey(username: string, masterPassword: string): Promise<CryptoKey> {
  await sodium.ready;
  const salt = sodium.crypto_generichash(16, enc.encode(username)); // per-user salt
  const pwd = enc.encode(masterPassword);
  try {
    const raw = sodium.crypto_pwhash(
      32, pwd, salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt","decrypt"]);
  } finally { zeroize(pwd); }
}

export async function encryptEntry(plaintext: string, key: CryptoKey, meta?: Record<string, unknown>): Promise<CipherBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const pt = enc.encode(plaintext);
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, pt);
  const all = new Uint8Array(ctBuf);
  const tag = all.slice(all.length - 16);
  const body = all.slice(0, all.length - 16);
  return { ct: b64enc(body.buffer), iv: b64enc(iv.buffer), tag: b64enc(tag.buffer), meta };
}

export async function decryptEntry(blob: CipherBlob, key: CryptoKey): Promise<string> {
  const body = new Uint8Array(b64dec(blob.ct));
  const iv   = new Uint8Array(b64dec(blob.iv));
  const tag  = new Uint8Array(b64dec(blob.tag));
  const ct = new Uint8Array(body.length + tag.length);
  ct.set(body, 0); ct.set(tag, body.length);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return dec.decode(pt);
}
