import { useState } from "react";
import { ErrorBox } from "../components/Error";

interface Props {
  onPasswordOk: (mfaEnabled: boolean) => void;
}

export default function Login({ onPasswordOk }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await response.json();
      console.log("Login API result:", data);

      if (!response.ok || data.success === false) {
        setError(data.message || "Invalid username or password.");
        setLoading(false);
        return;
      }

      // SUCCESS → Send MFA state to parent
      onPasswordOk(data.mfaEnabled);
      
    } catch (err) {
      console.error(err);
      setError("Network error. Try again.");
    }

    setLoading(false);
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
              disabled={loading}
            />
          </div>

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <p className="helper-text">
            Demo login: <strong>testuser</strong> / <strong>Test123!</strong>
          </p>
        </form>
      </div>
    </div>
  );
}
