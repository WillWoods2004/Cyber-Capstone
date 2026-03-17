/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useRef, useState } from "react";
import { deriveMasterKey, encryptEntry, decryptEntry, type CipherBlob } from "./crypto";
import { VAULT_API_BASE } from "../config/api";
import { getVaultAuthToken } from "../auth/session";

type Ctx = {
  isReady: boolean;
  setMasterPassword: (username: string, password: string) => Promise<void>;
  encryptOnly: (plaintext: string, meta?: Record<string, unknown>) => Promise<CipherBlob>;
  storeCipherBlob: (blob: CipherBlob) => Promise<{ id: string }>;
  encryptAndStore: (plaintext: string, meta?: Record<string, unknown>) => Promise<{ id: string }>;
  listItems: () => Promise<CipherBlob[]>;
  getItemById: (id: string) => Promise<CipherBlob>;
  deleteItem: (id: string) => Promise<void>;
  decryptItem: (item: CipherBlob) => Promise<string>;
  clearKey: () => void;
};

const CryptoCtx = createContext<Ctx | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const keyRef = useRef<CryptoKey | null>(null);
  const [isReady, setReady] = useState(false);

  function getAuthorizedHeaders(includeJsonContentType = false): HeadersInit {
    const token = getVaultAuthToken();
    if (!token) throw new Error("Vault session missing. Please complete MFA sign-in again.");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (includeJsonContentType) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  const value = useMemo<Ctx>(
    () => ({
      isReady,
      async setMasterPassword(username, password) {
        keyRef.current = await deriveMasterKey(username, password);
        setReady(true);
      },
      async encryptOnly(plaintext, meta) {
        if (!keyRef.current) throw new Error("Key not set");
        return encryptEntry(plaintext, keyRef.current, meta);
      },
      async storeCipherBlob(blob) {
        const res = await fetch(`${VAULT_API_BASE}/vault/items`, {
          method: "POST",
          headers: getAuthorizedHeaders(true),
          body: JSON.stringify(blob),
        });
        if (!res.ok) throw new Error(`Store failed: ${res.status}`);
        const payload = await res.json().catch(() => ({}));
        const id = payload?.id;
        if (!id || typeof id !== "string") throw new Error("Store failed: missing id");
        return { id };
      },
      async encryptAndStore(plaintext, meta) {
        if (!keyRef.current) throw new Error("Key not set");
        const blob = await encryptEntry(plaintext, keyRef.current, meta);
        const res = await fetch(`${VAULT_API_BASE}/vault/items`, {
          method: "POST",
          headers: getAuthorizedHeaders(true),
          body: JSON.stringify(blob),
        });
        if (!res.ok) throw new Error(`Store failed: ${res.status}`);
        const payload = await res.json().catch(() => ({}));
        const id = payload?.id;
        if (!id || typeof id !== "string") throw new Error("Store failed: missing id");
        return { id };
      },
      async listItems() {
        const res = await fetch(`${VAULT_API_BASE}/vault/items`, {
          headers: getAuthorizedHeaders(),
        });
        if (!res.ok) throw new Error(`List failed: ${res.status}`);
        const payload = await res.json(); // { items: [...] }
        return Array.isArray(payload) ? payload : (payload.items ?? []);
      },
      async getItemById(id) {
        const res = await fetch(`${VAULT_API_BASE}/vault/items/${encodeURIComponent(id)}`, {
          headers: getAuthorizedHeaders(),
        });
        if (!res.ok) throw new Error(`Get item failed: ${res.status}`);
        return res.json();
      },
      async deleteItem(id) {
        const res = await fetch(`${VAULT_API_BASE}/vault/items/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: getAuthorizedHeaders(),
        });
        if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
      },
      async decryptItem(item) {
        if (!keyRef.current) throw new Error("Key not set");
        return decryptEntry(item, keyRef.current);
      },
      clearKey() {
        keyRef.current = null;
        setReady(false);
      },
    }),
    [isReady]
  );

  return <CryptoCtx.Provider value={value}>{children}</CryptoCtx.Provider>;
}

export function useCrypto() {
  const ctx = useContext(CryptoCtx);
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
}

