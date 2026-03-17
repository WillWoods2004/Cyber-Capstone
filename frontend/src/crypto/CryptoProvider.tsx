/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useRef, useState } from "react";
import {
  decryptEntry,
  decryptEntryBytes,
  deriveMasterKey,
  encryptEntry,
  encryptEntryBytes,
  generateVaultSalt,
  type CipherBlob,
  type VaultProfile,
  zeroize,
} from "./crypto";
import { VAULT_API_BASE } from "../config/api";
import { getAuthToken } from "../auth/session";

type RotateVaultKeyInput = {
  currentPassword: string;
  newPassword: string;
};

type Ctx = {
  isReady: boolean;
  vaultProfile: VaultProfile | null;
  unlockVault: (username: string, password: string, profile: VaultProfile) => Promise<void>;
  encryptOnly: (plaintext: string, meta?: Record<string, unknown>) => Promise<CipherBlob>;
  storeCipherBlob: (blob: CipherBlob) => Promise<{ id: string }>;
  encryptAndStore: (plaintext: string, meta?: Record<string, unknown>) => Promise<{ id: string }>;
  listItems: () => Promise<CipherBlob[]>;
  getItem: (id: string) => Promise<CipherBlob>;
  decryptItem: (item: CipherBlob) => Promise<string>;
  rotateVaultKey: (input: RotateVaultKeyInput) => Promise<VaultProfile>;
  clearKey: () => void;
};

const CryptoCtx = createContext<Ctx | null>(null);

function normalizeVaultProfile(value: unknown): VaultProfile {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as { salt?: unknown }).salt !== "string" ||
    typeof (value as { keyVersion?: unknown }).keyVersion !== "number"
  ) {
    throw new Error("Vault profile is missing or invalid.");
  }

  return {
    salt: (value as { salt: string }).salt,
    keyVersion: (value as { keyVersion: number }).keyVersion,
  };
}

function sanitizeMeta(meta?: Record<string, unknown>, keyVersion?: number) {
  const nextMeta = { ...(meta ?? {}) };
  delete nextMeta.userId;

  if (typeof keyVersion === "number") {
    nextMeta.keyVersion = keyVersion;
  }

  return nextMeta;
}

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const keyBytesRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const usernameRef = useRef<string>("");
  const profileRef = useRef<VaultProfile | null>(null);
  const [isReady, setReady] = useState(false);
  const [vaultProfile, setVaultProfile] = useState<VaultProfile | null>(null);

  function requireKeyBytes() {
    if (!keyBytesRef.current) {
      throw new Error("Vault is locked. Sign in again to continue.");
    }

    return keyBytesRef.current;
  }

  function requireAuthToken() {
    const token = getAuthToken();
    if (!token) {
      throw new Error("Missing auth token. Complete MFA again.");
    }

    return token;
  }

  async function authorizedFetch(path: string, init: RequestInit = {}) {
    const token = requireAuthToken();
    const headers = new Headers(init.headers ?? {});
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(`${VAULT_API_BASE}${path}`, {
      ...init,
      headers,
    });
  }

  function clearKey() {
    if (keyBytesRef.current) {
      zeroize(keyBytesRef.current);
    }

    keyBytesRef.current = null;
    usernameRef.current = "";
    profileRef.current = null;
    setVaultProfile(null);
    setReady(false);
  }

  async function unlockVault(username: string, password: string, profile: VaultProfile) {
    clearKey();

    const keyBytes = await deriveMasterKey(password, profile.salt);
    keyBytesRef.current = keyBytes;
    usernameRef.current = username;
    profileRef.current = profile;
    setVaultProfile(profile);
    setReady(true);
  }

  async function encryptOnly(plaintext: string, meta?: Record<string, unknown>) {
    const keyBytes = requireKeyBytes();
    const profile = profileRef.current;

    return encryptEntry(
      plaintext,
      keyBytes,
      sanitizeMeta(meta, profile?.keyVersion)
    );
  }

  async function storeCipherBlob(blob: CipherBlob) {
    const res = await authorizedFetch("/vault/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...blob,
        meta: sanitizeMeta(blob.meta, profileRef.current?.keyVersion),
      }),
    });

    if (!res.ok) {
      throw new Error(`Store failed: ${res.status}`);
    }

    const payload = await res.json().catch(() => ({}));
    const id = payload?.id;
    if (!id || typeof id !== "string") {
      throw new Error("Store failed: missing id");
    }

    return { id };
  }

  async function encryptAndStore(plaintext: string, meta?: Record<string, unknown>) {
    const blob = await encryptOnly(plaintext, meta);
    return storeCipherBlob(blob);
  }

  async function listItems() {
    const res = await authorizedFetch("/vault/items");
    if (!res.ok) {
      throw new Error(`List failed: ${res.status}`);
    }

    const payload = await res.json().catch(() => ({}));
    return Array.isArray(payload) ? payload : (payload.items ?? []);
  }

  async function getItem(id: string) {
    const res = await authorizedFetch(`/vault/items/${id}`);
    if (!res.ok) {
      throw new Error(`Get failed: ${res.status}`);
    }

    return res.json();
  }

  async function decryptItem(item: CipherBlob) {
    const keyBytes = requireKeyBytes();
    return decryptEntry(item, keyBytes);
  }

  async function rotateVaultKey({ currentPassword, newPassword }: RotateVaultKeyInput) {
    if (!currentPassword.trim()) {
      throw new Error("Current master password is required.");
    }

    if (newPassword.trim().length < 8) {
      throw new Error("New master password must be at least 8 characters.");
    }

    const oldKeyBytes = requireKeyBytes();
    const profile = profileRef.current;
    if (!profile) {
      throw new Error("Vault profile is unavailable.");
    }

    const nextSalt = generateVaultSalt();
    const nextKeyBytes = await deriveMasterKey(newPassword, nextSalt);

    try {
      const currentItems = await listItems();
      const rotatedItems: CipherBlob[] = [];

      for (const item of currentItems) {
        const plaintextBytes = await decryptEntryBytes(item, oldKeyBytes);
        const rotated = await encryptEntryBytes(
          plaintextBytes,
          nextKeyBytes,
          sanitizeMeta(item.meta, profile.keyVersion + 1)
        );

        if (item.id) {
          rotated.id = item.id;
        }

        rotatedItems.push(rotated);
      }

      const res = await authorizedFetch("/vault/rotate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newVaultSalt: nextSalt,
          items: rotatedItems,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(
          (payload && (payload.message || payload.error)) ||
            `Rotation failed: ${res.status}`
        );
      }

      const payload = await res.json().catch(() => ({}));
      const nextProfile = normalizeVaultProfile(payload?.vaultProfile);

      zeroize(oldKeyBytes);
      keyBytesRef.current = nextKeyBytes;
      profileRef.current = nextProfile;
      setVaultProfile(nextProfile);
      setReady(true);

      return nextProfile;
    } catch (error) {
      zeroize(nextKeyBytes);
      throw error;
    }
  }

  const value: Ctx = {
    isReady,
    vaultProfile,
    unlockVault,
    encryptOnly,
    storeCipherBlob,
    encryptAndStore,
    listItems,
    getItem,
    decryptItem,
    rotateVaultKey,
    clearKey,
  };

  return <CryptoCtx.Provider value={value}>{children}</CryptoCtx.Provider>;
}

export function useCrypto() {
  const ctx = useContext(CryptoCtx);
  if (!ctx) {
    throw new Error("useCrypto must be used within CryptoProvider");
  }

  return ctx;
}
