const DEFAULT_API_BASE = "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod";

function normalizeBase(value: string | undefined, fallback: string): string {
  const raw = value?.trim();
  const base = raw && raw.length > 0 ? raw : fallback;
  return base.replace(/\/+$/, "");
}

const unifiedBase = normalizeBase(import.meta.env.VITE_API_BASE as string | undefined, DEFAULT_API_BASE);

export const API_BASE = unifiedBase;
export const AUTH_API_BASE = normalizeBase(import.meta.env.VITE_AUTH_API_BASE as string | undefined, unifiedBase);
export const VAULT_API_BASE = normalizeBase(import.meta.env.VITE_VAULT_API_BASE as string | undefined, unifiedBase);
