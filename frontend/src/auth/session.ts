const CHALLENGE_TOKEN_KEY = "securitypass.challengeToken";
const AUTH_TOKEN_KEY = "securitypass.authToken";

function storage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function saveChallengeToken(token: string) {
  storage()?.setItem(CHALLENGE_TOKEN_KEY, token);
}

export function getChallengeToken(): string | null {
  return storage()?.getItem(CHALLENGE_TOKEN_KEY) ?? null;
}

export function clearChallengeToken() {
  storage()?.removeItem(CHALLENGE_TOKEN_KEY);
}

export function saveAuthToken(token: string) {
  storage()?.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return storage()?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function clearAuthToken() {
  storage()?.removeItem(AUTH_TOKEN_KEY);
}

export function clearSessionTokens() {
  clearChallengeToken();
  clearAuthToken();
}
