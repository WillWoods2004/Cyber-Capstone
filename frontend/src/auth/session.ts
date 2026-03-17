export type VaultSession = {
  username: string;
  token: string;
};

const SESSION_KEY = "securitypass.vaultSession";

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveVaultSession(session: VaultSession) {
  const storage = getSessionStorage();
  if (!storage) return;

  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadVaultSession(): VaultSession | null {
  const storage = getSessionStorage();
  if (!storage) return null;

  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<VaultSession>;
    if (typeof parsed.username !== "string" || typeof parsed.token !== "string") {
      storage.removeItem(SESSION_KEY);
      return null;
    }

    return {
      username: parsed.username,
      token: parsed.token,
    };
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getVaultAuthToken(): string | null {
  return loadVaultSession()?.token ?? null;
}

export function clearVaultSession() {
  const storage = getSessionStorage();
  if (!storage) return;

  storage.removeItem(SESSION_KEY);
}
