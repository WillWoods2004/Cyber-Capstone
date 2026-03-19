import sodium from "libsodium-wrappers-sumo";

export type CipherBlob = {
  id?: string;
  ct: string;
  iv: string;
  tag: string;
  meta?: Record<string, unknown>;
};

export type VaultProfile = {
  salt: string;
  keyVersion: number;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 1) {
    text += String.fromCharCode(bytes[i]);
  }
  return btoa(text);
}

function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

function ownBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out;
}

export function zeroize(...buffers: Array<ArrayBufferView | null | undefined>) {
  for (const buffer of buffers) {
    if (!buffer) {
      continue;
    }

    new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).fill(0);
  }
}

export function generateVaultSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bytesToBase64(salt);
}

async function importKeyMaterial(keyBytes: Uint8Array<ArrayBuffer>, usages: KeyUsage[]) {
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, usages);
}

export async function deriveMasterKey(masterPassword: string, saltB64: string): Promise<Uint8Array<ArrayBuffer>> {
  await sodium.ready;
  const passwordBytes = enc.encode(masterPassword);
  const salt = base64ToBytes(saltB64);

  try {
    const raw = sodium.crypto_pwhash(
      32,
      passwordBytes,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    return ownBytes(new Uint8Array(raw));
  } finally {
    zeroize(passwordBytes, salt);
  }
}

export async function deriveLegacyMasterKey(
  username: string,
  masterPassword: string
): Promise<Uint8Array<ArrayBuffer>> {
  await sodium.ready;
  const usernameBytes = enc.encode(username);
  const passwordBytes = enc.encode(masterPassword);
  const salt = new Uint8Array(sodium.crypto_generichash(16, usernameBytes));

  try {
    const raw = sodium.crypto_pwhash(
      32,
      passwordBytes,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    return ownBytes(new Uint8Array(raw));
  } finally {
    zeroize(usernameBytes, passwordBytes, salt);
  }
}

export async function encryptEntryBytes(
  plaintext: Uint8Array,
  keyBytes: Uint8Array<ArrayBuffer>,
  meta?: Record<string, unknown>
): Promise<CipherBlob> {
  const ownedPlaintext = ownBytes(plaintext);
  const iv = ownBytes(crypto.getRandomValues(new Uint8Array(12)));
  const key = await importKeyMaterial(ownBytes(keyBytes), ["encrypt"]);

  try {
    const sealed = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, ownedPlaintext)
    );
    const tag = sealed.slice(sealed.length - 16);
    const body = sealed.slice(0, sealed.length - 16);

    return {
      ct: bytesToBase64(body),
      iv: bytesToBase64(iv),
      tag: bytesToBase64(tag),
      meta,
    };
  } finally {
    zeroize(ownedPlaintext, iv);
  }
}

export async function encryptEntry(
  plaintext: string,
  keyBytes: Uint8Array<ArrayBuffer>,
  meta?: Record<string, unknown>
): Promise<CipherBlob> {
  const plaintextBytes = enc.encode(plaintext);
  return encryptEntryBytes(plaintextBytes, keyBytes, meta);
}

export async function decryptEntryBytes(
  blob: CipherBlob,
  keyBytes: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const body = ownBytes(base64ToBytes(blob.ct));
  const iv = ownBytes(base64ToBytes(blob.iv));
  const tag = ownBytes(base64ToBytes(blob.tag));
  const sealed = new Uint8Array(body.length + tag.length);
  sealed.set(body, 0);
  sealed.set(tag, body.length);

  const key = await importKeyMaterial(ownBytes(keyBytes), ["decrypt"]);

  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, sealed);
    return new Uint8Array(plaintext);
  } finally {
    zeroize(body, iv, tag, sealed);
  }
}

export async function decryptEntry(blob: CipherBlob, keyBytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const plaintext = await decryptEntryBytes(blob, keyBytes);

  try {
    return dec.decode(plaintext);
  } finally {
    zeroize(plaintext);
  }
}
