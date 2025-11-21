// Front-End/frontend/src/pages/Register.tsx

import { useState } from "react";
import { ErrorBox } from "../components/Error";

const API_BASE =
  "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod";

interface Props {
  onRegistered: (username: string) => void;
  onCancel: () => void;
}

export default function Register({ onRegistered, onCancel }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !confirm) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password should be at least 8 characters long.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setError(
          data.message ||
            `Registration failed (status ${response.status}). Please try again.`
        );
        return;
      }

      // Registration successful – hand username back to App so we can prefill login
      onRegistered(username);
    } catch (err) {
      console.error("Registration network error:", err);
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-wrapper">
      <div className="auth-card">
        <h2 className="auth-overline">SecurityPass</h2>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">
          Set up a SecurityPass account to store your passwords securely.
        </p>

        <ErrorBox message={error} />

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>Username</label>
            <input
              type="text"
              placeholder="your.username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="form-field">
            <label>Confirm password</label>
            <input
              type="password"
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-btn"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="helper-text" style={{ marginTop: "1rem" }}>
            Already have an account?{" "}
            <button
              type="button"
              onClick={onCancel}
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
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
