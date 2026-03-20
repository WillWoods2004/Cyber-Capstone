import { useState } from "react";
import { ErrorBox } from "../components/Error";
import { useCrypto } from "../crypto/CryptoProvider";
import type { VaultProfile } from "../crypto/crypto";
import { AUTH_API_BASE } from "../config/api";
import { clearSessionTokens, saveChallengeToken } from "../auth/session";

const MAX_ATTEMPTS = 5;

interface Props {
  onPasswordOk: (mfaFromApi: boolean, username: string) => void;
  onShowRegister: () => void;
  initialUsername?: string;
}

function normalizeVaultProfile(value: unknown): VaultProfile {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as { salt?: unknown }).salt !== "string" ||
    typeof (value as { keyVersion?: unknown }).keyVersion !== "number"
  ) {
    throw new Error("Vault profile is missing from the login response.");
  }

  return {
    salt: (value as { salt: string }).salt,
    keyVersion: (value as { keyVersion: number }).keyVersion,
  };
}

export default function Login({
  onPasswordOk,
  onShowRegister,
  initialUsername = "",
}: Props) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const { setLegacyMasterPassword, unlockVault, clearKey } = useCrypto();

  const limitReached = attempts >= MAX_ATTEMPTS;
  const attemptsRemaining = Math.max(MAX_ATTEMPTS - attempts, 0);

  const registerFailedAttempt = (message?: string) => {
    const nextAttempts = attempts + 1;
    const nextRemaining = Math.max(MAX_ATTEMPTS - nextAttempts, 0);

    setAttempts(nextAttempts);
    setPassword("");
    setCapsOn(false);
    clearKey();

    if (nextAttempts >= MAX_ATTEMPTS) {
      setError("Password attempt limit reached. Refresh the page to try again.");
    } else {
      setError(
        `${message || "Incorrect password. Please try again."} ${nextRemaining} password attempt${
          nextRemaining === 1 ? "" : "s"
        } remaining.`
      );
    }
  };

  const handleCapsCheck = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const isCaps = event.getModifierState?.("CapsLock") || false;
    setCapsOn(isCaps);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (limitReached) {
      setError("Password attempt limit reached. Refresh the page to try again.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${AUTH_API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch((): Record<string, unknown> => ({}));
      if (!response.ok || !data.success) {
        const serverMessage =
          (typeof data.message === "string" && data.message) ||
          (typeof data.error === "string" && data.error) ||
          `Server error (${response.status}). Please try again.`;
        registerFailedAttempt(serverMessage);
        return;
      }

      const challengeToken = typeof data.challengeToken === "string" ? data.challengeToken : "";
      if (challengeToken) {
        const profile = normalizeVaultProfile(data.vaultProfile);
        await unlockVault(username, password, profile);
        saveChallengeToken(challengeToken);
      } else {
        clearSessionTokens();
        await setLegacyMasterPassword(username, password);
      }

      setPassword("");
      setError("");
      setCapsOn(false);

      onPasswordOk(Boolean(data.mfaEnabled), username);
    } catch (err) {
      console.error("Login network error:", err);
      clearSessionTokens();
      clearKey();
      setError(err instanceof Error ? err.message : "Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-wrapper">
      <div className="auth-card">
        <h2 className="auth-overline">SecurityPass</h2>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Use your account to access the password manager.</p>

        <ErrorBox message={error} />

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>Username or Email</label>
            <input
              type="text"
              placeholder="your.email@example.com"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder={limitReached ? "Password entry locked" : "********"}
              value={password}
              onChange={(event) => {
                if (!limitReached) {
                  setPassword(event.target.value);
                }
              }}
              autoComplete="current-password"
              onKeyDown={handleCapsCheck}
              onKeyUp={handleCapsCheck}
              disabled={limitReached}
            />

            {capsOn && !limitReached && (
              <p className="caps-warning">Caps Lock is Turned On</p>
            )}

            {limitReached && (
              <p className="caps-warning">
                You have reached the maximum of {MAX_ATTEMPTS} password attempts. Refresh the page to try again.
              </p>
            )}
          </div>

          <button type="submit" disabled={limitReached || loading} className="primary-btn">
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="helper-text" style={{ marginTop: "0.75rem" }}>
            {attemptsRemaining} password attempt{attemptsRemaining === 1 ? "" : "s"} remaining.
          </p>

          <p className="helper-text" style={{ marginTop: "1rem" }}>
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={onShowRegister}
              className="link-button"
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#3b82f6",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Create one
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
