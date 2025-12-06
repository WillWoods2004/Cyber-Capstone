import { createContext, useContext, useMemo, useRef, useState } from "react";
import { deriveMasterKey, encryptEntry, decryptEntry, type CipherBlob } from "./crypto";

type Ctx = {
  isReady: boolean;
  setMasterPassword: (username: string, password: string) => Promise<void>;
  encryptAndStore: (plaintext: string, meta?: Record<string, unknown>) => Promise<{ id: string }>;
  listItems: () => Promise<CipherBlob[]>;
  decryptItem: (item: CipherBlob) => Promise<string>;
  clearKey: () => void;
};

const API_BASE = import.meta.env.VITE_API_BASE as string;
const CryptoCtx = createContext<Ctx | null>(null);

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const keyRef = useRef<CryptoKey | null>(null);
  const [isReady, setReady] = useState(false);

  const value = useMemo<Ctx>(() => ({
    isReady,
    async setMasterPassword(username, password) {
      keyRef.current = await deriveMasterKey(username, password);
      setReady(true);
    },
    async encryptAndStore(plaintext, meta) {
      if (!keyRef.current) throw new Error("Key not set");
      const blob = await encryptEntry(plaintext, keyRef.current, meta);
      const res = await fetch(`${API_BASE}/vault/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blob),
      });
      if (!res.ok) throw new Error(`Store failed: ${res.status}`);
      const { id } = await res.json();
      return { id };
    },
    async listItems() {
      const res = await fetch(`${API_BASE}/vault/items`);
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      const payload = await res.json(); // { items: [...] }
      // IMPORTANT: API returns an object with 'items'; unwrap to array.
      return Array.isArray(payload) ? payload : (payload.items ?? []);
    },
    async decryptItem(item) {
      if (!keyRef.current) throw new Error("Key not set");
      return decryptEntry(item, keyRef.current);
    },
    clearKey() {
      keyRef.current = null;
      setReady(false);
    },
  }), [isReady]);

  return <CryptoCtx.Provider value={value}>{children}</CryptoCtx.Provider>;
}

export function useCrypto() {
  const ctx = useContext(CryptoCtx);
  if (!ctx) throw new Error("useCrypto must be used within CryptoProvider");
  return ctx;
}
