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

const LEGACY_PROFILE_KIND = "securitypass-vault-profile";

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

function normalizeUserMarker(value: string) {
  return value.trim().toLowerCase();
}

function sanitizeLegacyMeta(
  username: string,
  meta?: Record<string, unknown>,
  keyVersion?: number
) {
  const nextMeta = { ...(meta ?? {}) };
  nextMeta.userId = username;

  if (
    typeof nextMeta.username !== "string" &&
    typeof nextMeta.login !== "string"
  ) {
    nextMeta.username = username;
  }

  if (typeof keyVersion === "number") {
    nextMeta.keyVersion = keyVersion;
  }

  return nextMeta;
}

function extractItems(payload: unknown): CipherBlob[] {
  if (Array.isArray(payload)) {
    return payload as CipherBlob[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { items?: unknown }).items)
  ) {
    return (payload as { items: CipherBlob[] }).items;
  }

  return [];
}

function belongsToUser(item: CipherBlob, username: string) {
  const meta = (item.meta as Record<string, unknown> | undefined) ?? {};
  const normalizedUsername = normalizeUserMarker(username);
  const markers = [meta.userId, meta.username, meta.login]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map(normalizeUserMarker);

  return markers.some((marker) => marker === normalizedUsername);
}

function legacyProfileItemId(username: string) {
  return `vault-profile-${normalizeUserMarker(username).replace(/[^a-z0-9_-]/g, "_")}`;
}

function isLegacyProfileItem(item: CipherBlob, username: string) {
  const meta = (item.meta as Record<string, unknown> | undefined) ?? {};
  return meta.system === LEGACY_PROFILE_KIND && belongsToUser(item, username);
}

function extractLegacyProfile(items: CipherBlob[], username: string): VaultProfile | null {
  const profileItem = items.find((item) => isLegacyProfileItem(item, username));
  if (!profileItem) {
    return null;
  }

  const meta = (profileItem.meta as Record<string, unknown> | undefined) ?? {};
  const salt = typeof meta.salt === "string" ? meta.salt : "";
  const rawKeyVersion = meta.keyVersion;
  const keyVersion =
    typeof rawKeyVersion === "number"
      ? rawKeyVersion
      : typeof rawKeyVersion === "string"
        ? Number(rawKeyVersion)
        : Number.NaN;

  if (!salt || !Number.isFinite(keyVersion) || keyVersion < 1) {
    return null;
  }

  return { salt, keyVersion };
}

function sameBytes(a: Uint8Array<ArrayBuffer>, b: Uint8Array<ArrayBuffer>) {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  for (let index = 0; index < a.byteLength; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
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

  const fetchRawItems = useCallback(async () => {
    const res = await authorizedFetch("/vault/items");
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`List failed: ${res.status}${errText ? ` - ${errText}` : ""}`);
    }

    const payload = await res.json().catch(() => ({}));
    return extractItems(payload);
  }, [authorizedFetch]);

  const persistCipherBlob = useCallback(
    async (
      blob: CipherBlob,
      options?: {
        legacyMeta?: Record<string, unknown>;
        tokenizedMeta?: Record<string, unknown>;
      }
    ) => {
      const body =
        modeRef.current === "tokenized"
          ? {
              ...blob,
              meta: options?.tokenizedMeta ?? sanitizeSecureMeta(blob.meta, profileRef.current?.keyVersion),
            }
          : {
              ...blob,
              meta:
                options?.legacyMeta ??
                sanitizeLegacyMeta(usernameRef.current, blob.meta, profileRef.current?.keyVersion ?? 1),
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

      let legacyProfile = null as VaultProfile | null;

      try {
        const rawItems = await fetchRawItems();
        legacyProfile = extractLegacyProfile(rawItems, username);
      } catch {
        legacyProfile = null;
      }

      const keyBytes = legacyProfile
        ? await deriveMasterKey(password, legacyProfile.salt)
        : await deriveLegacyMasterKey(username, password);

      const initialProfile = legacyProfile ?? { salt: "", keyVersion: 1 };
      keyBytesRef.current = keyBytes;
      usernameRef.current = username;
      profileRef.current = initialProfile;
      modeRef.current = "legacy";
      setVaultProfile(initialProfile);
      setVaultMode("legacy");
      setReady(true);
    },
    [clearKey, fetchRawItems]
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
    async (blob: CipherBlob) => persistCipherBlob(blob),
    [persistCipherBlob]
  );

  const encryptAndStore = useCallback(
    async (plaintext: string, meta?: Record<string, unknown>) => {
      const blob = await encryptOnly(plaintext, meta);
      return storeCipherBlob(blob);
    },
    [encryptOnly, storeCipherBlob]
  );

  const listItems = useCallback(async () => {
    const items = await fetchRawItems();

    if (modeRef.current === "legacy") {
      return items.filter(
        (item) =>
          belongsToUser(item, usernameRef.current) &&
          !isLegacyProfileItem(item, usernameRef.current)
      );
    }

    return items;
  }, [fetchRawItems]);

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
      if (!currentPassword.trim()) {
        throw new Error("Current master password is required.");
      }

      if (modeRef.current === "tokenized" && newPassword.trim().length < 8) {
        throw new Error("New master password must be at least 8 characters.");
      }

      const oldKeyBytes = requireKeyBytes();
      const profile = profileRef.current;
      const currentProfile = profile ?? { salt: "", keyVersion: 1 };

      if (modeRef.current === "legacy") {
        const verifyKey = currentProfile.salt
          ? await deriveMasterKey(currentPassword, currentProfile.salt)
          : await deriveLegacyMasterKey(usernameRef.current, currentPassword);

        try {
          if (!sameBytes(verifyKey, oldKeyBytes)) {
            throw new Error("Current sign-in password is incorrect.");
          }
        } finally {
          zeroize(verifyKey);
        }

        const nextSalt = generateVaultSalt();
        const nextKeyBytes = await deriveMasterKey(currentPassword, nextSalt);
        const nextProfile: VaultProfile = {
          salt: nextSalt,
          keyVersion: (currentProfile.keyVersion ?? 1) + 1,
        };

        try {
          const currentItems = await listItems();
          const rotatedItems: CipherBlob[] = [];
          const originalItems = currentItems.map((item) => ({ ...item }));

          for (const item of currentItems) {
            const plaintextBytes = await decryptEntryBytes(item, oldKeyBytes);

            try {
              const rotated = await encryptEntryBytes(
                plaintextBytes,
                nextKeyBytes,
                sanitizeLegacyMeta(
                  usernameRef.current,
                  item.meta as Record<string, unknown> | undefined,
                  nextProfile.keyVersion
                )
              );

              if (item.id) {
                rotated.id = item.id;
              }

              rotatedItems.push(rotated);
            } finally {
              zeroize(plaintextBytes);
            }
          }

          const timestamp = new Date().toISOString();
          const profileBlob = await encryptEntry(
            `vault-profile:v${nextProfile.keyVersion}`,
            nextKeyBytes,
            sanitizeLegacyMeta(
              usernameRef.current,
              {
                system: LEGACY_PROFILE_KIND,
                salt: nextProfile.salt,
                keyVersion: nextProfile.keyVersion,
                createdAt: timestamp,
                savedAt: timestamp,
              },
              nextProfile.keyVersion
            )
          );
          profileBlob.id = legacyProfileItemId(usernameRef.current);

          const rollback = async () => {
            for (const original of originalItems) {
              await persistCipherBlob(original, {
                legacyMeta: sanitizeLegacyMeta(
                  usernameRef.current,
                  original.meta as Record<string, unknown> | undefined,
                  currentProfile.keyVersion
                ),
              });
            }
          };

          try {
            for (const rotated of rotatedItems) {
              await persistCipherBlob(rotated, {
                legacyMeta: sanitizeLegacyMeta(
                  usernameRef.current,
                  rotated.meta as Record<string, unknown> | undefined,
                  nextProfile.keyVersion
                ),
              });
            }

            await persistCipherBlob(profileBlob, {
              legacyMeta: sanitizeLegacyMeta(
                usernameRef.current,
                profileBlob.meta as Record<string, unknown> | undefined,
                nextProfile.keyVersion
              ),
            });
          } catch (error) {
            try {
              await rollback();
            } catch {
              // Best-effort rollback; preserve the original error below.
            }
            throw error;
          }

          zeroize(oldKeyBytes);
          keyBytesRef.current = nextKeyBytes;
          profileRef.current = nextProfile;
          modeRef.current = "legacy";
          setVaultProfile(nextProfile);
          setVaultMode("legacy");
          setReady(true);

          return nextProfile;
        } catch (error) {
          zeroize(nextKeyBytes);
          throw error;
        }
      }

      if (!currentProfile) {
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
            sanitizeSecureMeta(item.meta, currentProfile.keyVersion + 1)
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
    [authorizedFetch, listItems, persistCipherBlob, requireKeyBytes]
  );

  const value = useMemo<Ctx>(
    () => ({
      isReady,
      vaultProfile,
      vaultMode,
      supportsKeyRotation: vaultMode !== null,
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
