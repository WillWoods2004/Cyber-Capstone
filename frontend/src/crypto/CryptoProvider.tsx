/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  decryptEntry,
  decryptEntryBytes,
  deriveLegacyMasterKey,
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

type VaultMode = "legacy" | "tokenized" | null;

type Ctx = {
  isReady: boolean;
  vaultProfile: VaultProfile | null;
  vaultMode: VaultMode;
  supportsKeyRotation: boolean;
  setLegacyMasterPassword: (username: string, password: string) => Promise<void>;
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

function sanitizeSecureMeta(meta?: Record<string, unknown>, keyVersion?: number) {
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
  const modeRef = useRef<VaultMode>(null);

  const [isReady, setReady] = useState(false);
  const [vaultProfile, setVaultProfile] = useState<VaultProfile | null>(null);
  const [vaultMode, setVaultMode] = useState<VaultMode>(null);

  const requireKeyBytes = useCallback(() => {
    if (!keyBytesRef.current) {
      throw new Error("Vault is locked. Sign in again to continue.");
    }

    return keyBytesRef.current;
  }, []);

  const authorizedFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers ?? {});
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${VAULT_API_BASE}${path}`, {
      ...init,
      headers,
    });
  }, []);

  const clearKey = useCallback(() => {
    if (keyBytesRef.current) {
      zeroize(keyBytesRef.current);
    }

    keyBytesRef.current = null;
    usernameRef.current = "";
    profileRef.current = null;
    modeRef.current = null;
    setVaultProfile(null);
    setVaultMode(null);
    setReady(false);
  }, []);

  const setLegacyMasterPassword = useCallback(
    async (username: string, password: string) => {
      clearKey();

      const keyBytes = await deriveLegacyMasterKey(username, password);
      keyBytesRef.current = keyBytes;
      usernameRef.current = username;
      profileRef.current = null;
      modeRef.current = "legacy";
      setVaultProfile(null);
      setVaultMode("legacy");
      setReady(true);
    },
    [clearKey]
  );

  const unlockVault = useCallback(
    async (username: string, password: string, profile: VaultProfile) => {
      clearKey();

      const keyBytes = await deriveMasterKey(password, profile.salt);
      keyBytesRef.current = keyBytes;
      usernameRef.current = username;
      profileRef.current = profile;
      modeRef.current = "tokenized";
      setVaultProfile(profile);
      setVaultMode("tokenized");
      setReady(true);
    },
    [clearKey]
  );

  const encryptOnly = useCallback(
    async (plaintext: string, meta?: Record<string, unknown>) => {
      const keyBytes = requireKeyBytes();

      if (modeRef.current === "tokenized") {
        return encryptEntry(plaintext, keyBytes, sanitizeSecureMeta(meta, profileRef.current?.keyVersion));
      }

      return encryptEntry(plaintext, keyBytes, {
        ...(meta ?? {}),
        userId: usernameRef.current,
      });
    },
    [requireKeyBytes]
  );

  const storeCipherBlob = useCallback(
    async (blob: CipherBlob) => {
      const body =
        modeRef.current === "tokenized"
          ? {
              ...blob,
              meta: sanitizeSecureMeta(blob.meta, profileRef.current?.keyVersion),
            }
          : {
              ...blob,
              meta: {
                ...(blob.meta ?? {}),
                userId: usernameRef.current,
              },
            };

      const res = await authorizedFetch("/vault/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Store failed: ${res.status}${errText ? ` - ${errText}` : ""}`);
      }

      const payload = await res.json().catch(() => ({}));
      const id = payload?.id;
      if (!id || typeof id !== "string") {
        throw new Error("Store failed: missing id");
      }

      return { id };
    },
    [authorizedFetch]
  );

  const encryptAndStore = useCallback(
    async (plaintext: string, meta?: Record<string, unknown>) => {
      const blob = await encryptOnly(plaintext, meta);
      return storeCipherBlob(blob);
    },
    [encryptOnly, storeCipherBlob]
  );

  const listItems = useCallback(async () => {
    const res = await authorizedFetch("/vault/items");
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`List failed: ${res.status}${errText ? ` - ${errText}` : ""}`);
    }

    const payload = await res.json().catch(() => ({}));
    const items: CipherBlob[] = Array.isArray(payload) ? payload : (payload.items ?? []);

    if (modeRef.current === "legacy") {
      return items.filter((item) => {
        const metaUser = (item.meta as { userId?: unknown } | undefined)?.userId;
        return typeof metaUser === "string" && metaUser === usernameRef.current;
      });
    }

    return items;
  }, [authorizedFetch]);

  const getItem = useCallback(
    async (id: string) => {
      const res = await authorizedFetch(`/vault/items/${id}`);
      if (res.ok) {
        return res.json();
      }

      if (modeRef.current === "legacy") {
        const items = await listItems();
        const hit = items.find((item) => item.id === id);
        if (hit) {
          return hit;
        }
      }

      const errText = await res.text().catch(() => "");
      throw new Error(`Get failed: ${res.status}${errText ? ` - ${errText}` : ""}`);
    },
    [authorizedFetch, listItems]
  );

  const decryptItem = useCallback(
    async (item: CipherBlob) => {
      const keyBytes = requireKeyBytes();
      return decryptEntry(item, keyBytes);
    },
    [requireKeyBytes]
  );

  const rotateVaultKey = useCallback(
    async ({ currentPassword, newPassword }: RotateVaultKeyInput) => {
      if (modeRef.current !== "tokenized") {
        throw new Error("Vault key rotation is not supported by the deployed API yet.");
      }

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
            sanitizeSecureMeta(item.meta, profile.keyVersion + 1)
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
            (payload && (payload.message || payload.error)) || `Rotation failed: ${res.status}`
          );
        }

        const payload = await res.json().catch(() => ({}));
        const nextProfile = normalizeVaultProfile(payload?.vaultProfile);

        zeroize(oldKeyBytes);
        keyBytesRef.current = nextKeyBytes;
        profileRef.current = nextProfile;
        modeRef.current = "tokenized";
        setVaultProfile(nextProfile);
        setVaultMode("tokenized");
        setReady(true);

        return nextProfile;
      } catch (error) {
        zeroize(nextKeyBytes);
        throw error;
      }
    },
    [authorizedFetch, listItems, requireKeyBytes]
  );

  const value = useMemo<Ctx>(
    () => ({
      isReady,
      vaultProfile,
      vaultMode,
      supportsKeyRotation: vaultMode === "tokenized",
      setLegacyMasterPassword,
      unlockVault,
      encryptOnly,
      storeCipherBlob,
      encryptAndStore,
      listItems,
      getItem,
      decryptItem,
      rotateVaultKey,
      clearKey,
    }),
    [
      clearKey,
      decryptItem,
      encryptAndStore,
      encryptOnly,
      getItem,
      isReady,
      listItems,
      rotateVaultKey,
      setLegacyMasterPassword,
      storeCipherBlob,
      unlockVault,
      vaultMode,
      vaultProfile,
    ]
  );

  return <CryptoCtx.Provider value={value}>{children}</CryptoCtx.Provider>;
}

export function useCrypto() {
  const ctx = useContext(CryptoCtx);
  if (!ctx) {
    throw new Error("useCrypto must be used within CryptoProvider");
  }

  return ctx;
}
