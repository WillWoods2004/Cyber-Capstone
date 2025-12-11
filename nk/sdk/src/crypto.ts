import sodium from "libsodium-wrappers-sumo"; // IMPORTANT: default import
import { randomBytes, webcrypto as wc } from "crypto";

export type DeriveParams = {
  /** Increase for stronger KDF at cost of CPU */
  opslimit?: number;
  /** Increase for stronger KDF at cost of memory */
  memlimit?: number;
  /** Optional fixed salt (32 random bytes recommended; 16 works here for demo) */
  salt?: Uint8Array;
};

export type CipherItem = {
  /** Ciphertext (base64, without tag) */
  ct: string;
  /** IV/nonce (12 bytes, base64) */
  iv: string;
  /** Auth tag (16 bytes, base64) */
  tag: string;
  /** Non-secret metadata */
  meta?: Record<string, unknown>;
};

const subtle = wc.subtle;

/**
 * Derive a 256-bit master key from a password using Argon2id.
 * Why: resistant to GPU cracking and side-channels; standard choice for secrets.
 */
export async function deriveMasterKey(
  password: string,
  params: DeriveParams = {}
): Promise<{ key: Uint8Array; salt: Uint8Array }> {
  await sodium.ready; // ensure WASM is initialized
  const salt = params.salt ?? randomBytes(16); // demo salt length; prefer 32 in production
  const key = sodium.crypto_pwhash(
    32, // 256-bit key
    password,
    salt,
    params.opslimit ?? sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    params.memlimit ?? sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT // Argon2id
  );
  return { key: new Uint8Array(key), salt };
}

/**
 * Encrypt a plaintext entry with AES-256-GCM.
 * Returns separate ct and tag so they’re explicit in the API contract.
 */
export async function encryptEntry(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
  meta?: Record<string, unknown>
): Promise<CipherItem> {
  const iv = randomBytes(12); // 96-bit nonce for GCM
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

  const tagLen = 16; // GCM tag 128 bits
  const tag = sealed.slice(sealed.length - tagLen);
  const ct = sealed.slice(0, sealed.length - tagLen);

  // best-effort zeroization of input plaintext
  plaintext.fill(0);

  return { iv: b64(iv), ct: b64(ct), tag: b64(tag), meta };
}

/**
 * Decrypt a CipherItem back to plaintext bytes.
 */
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

  const pt = await subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, sealed);
  return new Uint8Array(pt);
}

/** Zero-fill buffers (why: reduce residual sensitive data in memory). */
export function zeroize(...bufs: (Uint8Array | null | undefined)[]) {
  for (const b of bufs) if (b) b.fill(0);
}

export const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
export const ub64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
