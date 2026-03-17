import { useState } from "react";
import { ErrorBox } from "../components/Error";
import { useCrypto } from "../crypto/CryptoProvider";
import { AUTH_API_BASE } from "../config/api";

const MAX_ATTEMPTS = 5;

interface Props {
  onPasswordOk: (mfaFromApi: boolean, username: string) => void;
  onShowRegister: () => void;
  initialUsername?: string;
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
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isCaps = e.getModifierState && e.getModifierState("CapsLock");
    setCapsOn(isCaps);
  };

  const { setMasterPassword } = useCrypto();

  const limitReached = attempts >= MAX_ATTEMPTS;
  const attemptsRemaining = Math.max(MAX_ATTEMPTS - attempts, 0);

  const registerFailedAttempt = (message?: string) => {
    const nextAttempts = attempts + 1;
    const nextRemaining = Math.max(MAX_ATTEMPTS - nextAttempts, 0);

    setAttempts(nextAttempts);
    setPassword("");
    setCapsOn(false);

    if (nextAttempts >= MAX_ATTEMPTS) {
      setError(
        "Password attempt limit reached. Refresh the page to try again."
      );
    } else {
      setError(
        `${
          message || "Incorrect password. Please try again."
        } ${nextRemaining} password attempt${
          nextRemaining === 1 ? "" : "s"
        } remaining.`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (limitReached) {
      setError(
        "Password attempt limit reached. Refresh the page to try again."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${AUTH_API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        const serverMessage =
          (data && (data.message || data.error)) ||
          `Server error (${response.status}). Please try again.`;

        registerFailedAttempt(serverMessage);
        return;
      }

      if (data.success) {
        await setMasterPassword(username, password);
        setPassword("");
        setError("");
        setCapsOn(false);

        const mfaFromApi = Boolean(data.mfaEnabled);
        onPasswordOk(mfaFromApi, username);
      } else {
        registerFailedAttempt(data.message || "Incorrect password. Please try again.");
      }
    } catch (err) {
      console.error("Login network error:", err);
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-wrapper">
      <div className="auth-card">
        <h2 className="auth-overline">SecurityPass</h2>
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">
          Use your account to access the password manager.
        </p>

        <ErrorBox message={error} />

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>Username or Email</label>
            <input
              type="text"
              placeholder="your.email@example.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder={limitReached ? "Password entry locked" : "********"}
              value={password}
              onChange={(e) => {
                if (!limitReached) {
                  setPassword(e.target.value);
                }
              }}
              autoComplete="current-password"
              onKeyDown={handlePasswordKeyDown}
              disabled={limitReached}
            />
            {capsOn && !limitReached && (
              <p className="caps-warning">
                Caps Lock is ON. Your password may be entered incorrectly.
              </p>
            )}
            {limitReached && (
              <p className="caps-warning">
                You have reached the maximum of {MAX_ATTEMPTS} password attempts.
                Refresh the page to try again.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={limitReached || loading}
            className="primary-btn"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="helper-text" style={{ marginTop: "0.75rem" }}>
            {attemptsRemaining} password attempt
            {attemptsRemaining === 1 ? "" : "s"} remaining.
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
