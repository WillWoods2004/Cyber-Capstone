import type { CipherBlob } from "../crypto/crypto";

type PasswordRating = "Strong" | "Moderate" | "Weak";

type PasswordScore = {
  score: number;
  rating: PasswordRating;
};

export function normalizeUserMarker(value: string): string {
  return value.trim().toLowerCase();
}

export function belongsToCurrentUser(
  item: CipherBlob,
  currentUser: string
): boolean {
  const metaUserId = (item.meta?.userId as string | undefined) ?? "";
  const metaUsername = (item.meta?.username as string | undefined) ?? "";
  const metaLogin = (item.meta?.login as string | undefined) ?? "";

  if (!currentUser.trim()) {
    return true;
  }

  if (!metaUserId && !metaUsername && !metaLogin) {
    return true;
  }

  const normalizedCurrentUser = normalizeUserMarker(currentUser);
  const markers = [metaUserId, metaUsername, metaLogin]
    .filter((value): value is string => value.trim().length > 0)
    .map(normalizeUserMarker);

  return markers.includes(normalizedCurrentUser);
}

export function isWeakPassword(password: string): boolean {
  if (password.length < 8) return true;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length < 3;
}

export function scorePassword(password: string): PasswordScore {
  let score = 0;

  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score >= 85) return { score, rating: "Strong" };
  if (score >= 60) return { score, rating: "Moderate" };
  return { score, rating: "Weak" };
}

export function calcSecurityScore(total: number, weak: number): number {
  if (total === 0) return 100;
  const strongRatio = (total - weak) / total;
  return Math.round(strongRatio * 100);
}

export type VaultMode = "legacy" | "tokenized" | null;

export function filterVaultItems(
  items: CipherBlob[],
  currentUser: string,
  vaultMode: VaultMode
): CipherBlob[] {
  if (vaultMode === "tokenized") {
    return items;
  }

  return items.filter((item) => belongsToCurrentUser(item, currentUser));
}
