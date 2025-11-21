// Front-End/frontend/src/pages/Login.tsx

import { useState } from "react";
import { ErrorBox } from "../components/Error";

const MAX_ATTEMPTS = 3;
const API_BASE =
  "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (attempts >= MAX_ATTEMPTS) {
      setError("Password attempt limit reached.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        const serverMessage =
          (data && (data.message || data.error)) ?? undefined;

        setError(
          serverMessage ||
            `Server error (${response.status}). Please try again.`
        );
        return;
      }

      if (data.success) {
        // Use backend-provided MFA status
        const mfaFromApi = Boolean(data.mfaEnabled);
        onPasswordOk(mfaFromApi, username);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setError("Password attempt limit reached.");
        } else {
          setError(
            data.message || "Wrong username or password. Please try again."
          );
        }
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={attempts >= MAX_ATTEMPTS || loading}
            className="primary-btn"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

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
