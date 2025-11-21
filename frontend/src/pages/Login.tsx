import { useState } from "react";
import { ErrorBox } from "../components/Error";

const MAX_ATTEMPTS = 3;

// Your deployed API base URL (with /prod)
const API_BASE = "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod";

interface Props {
  onPasswordOk: () => void;
}

export default function Login({ onPasswordOk }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // lockout
    if (attempts >= MAX_ATTEMPTS) {
      setError("Password attempt limit reached.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      // This catches HTTP errors (500, 403, etc.)
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Login HTTP error:", res.status, text);
        setError("Network error. Try again.");
        return;
      }

      const data = await res.json();
      console.log("Login response:", data);

      // Expecting: { success: boolean, mfaEnabled: boolean, message: string }
      if (!data.success) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setError("Password attempt limit reached.");
        } else {
          setError("Wrong username or password.");
        }
        return;
      }

      // Password is correct
      onPasswordOk();
    } catch (err) {
      console.error("Login fetch failed:", err);
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
              onChange={e => setUsername(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={attempts >= MAX_ATTEMPTS || loading}
            className="primary-btn"
          >
            {loading ? "Signing in..." : "Log in"}
          </button>

          <p className="helper-text">
            Demo login: <strong>testuser</strong> / <strong>Test123!</strong>
          </p>
        </form>
      </div>
    </div>
  );
}
