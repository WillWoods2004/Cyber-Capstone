// Paste your working crypto.ts here (Argon2id + AES-GCM using libsodium-wrappers-sumo)
// nk/sdk/src/crypto.ts
/**
 * Zero-knowledge client crypto: Argon2id (libsodium crypto_pwhash) -> AES-256-GCM (WebCrypto)
 */
import * as sodium from "libsodium-wrappers-sumo";
import { randomBytes, webcrypto as wc } from "crypto";

export type DeriveParams = {
  opslimit?: number;
  memlimit?: number;
  salt?: Uint8Array;
};

export type CipherItem = {
  ct: string;
  iv: string;
  tag: string;
  meta?: Record<string, unknown>;
};

const subtle = wc.subtle;

export async function deriveMasterKey(
  password: string,
  params: DeriveParams = {}
): Promise<{ key: Uint8Array; salt: Uint8Array }> {
  await sodium.ready;
  const salt = params.salt ?? randomBytes(16);
  const key = sodium.crypto_pwhash(
    32,
    password,
    salt,
    params.opslimit ?? sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    params.memlimit ?? sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT
  );
  return { key: new Uint8Array(key), salt };
}

export async function encryptEntry(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
  meta?: Record<string, unknown>
): Promise<CipherItem> {
  const iv = randomBytes(12);
  const cryptoKey = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const sealed = new Uint8Array(
    await subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, plaintext)
  );
  const tag = sealed.slice(sealed.length - 16);
  const ct = sealed.slice(0, sealed.length - 16);
  plaintext.fill(0); // best-effort zeroization
  return { iv: b64(iv), ct: b64(ct), tag: b64(tag), meta };
}

export async function decryptEntry(
  keyBytes: Uint8Array,
  item: CipherItem
): Promise<Uint8Array> {
  const iv = ub64(item.iv);
  const tag = ub64(item.tag);
  const ct = ub64(item.ct);
  const sealed = new Uint8Array(ct.length + tag.length);
  sealed.set(ct, 0);
  sealed.set(tag, ct.length);
  const cryptoKey = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  return new Uint8Array(
    await subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, sealed)
  );
}

export function zeroize(...bufs: (Uint8Array | null | undefined)[]) {
  for (const b of bufs) if (b) b.fill(0);
}
export const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
export const ub64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
