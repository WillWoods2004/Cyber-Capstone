import { useState } from "react";
import { ErrorBox } from "../components/Error";

const MAX_ATTEMPTS = 3;

interface Props {
  onPasswordOk: () => void;
}

export default function Login({ onPasswordOk }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (attempts >= MAX_ATTEMPTS) {
      setError("Password attempt limit reached.");
      return;
    }

    if (username === "testuser" && password === "Test123!") {
      onPasswordOk();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setError("Password attempt limit reached.");
      } else {
        setError("Wrong username or password.");
      }
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
            disabled={attempts >= MAX_ATTEMPTS}
            className="primary-btn"
          >
            Log in
          </button>

          <p className="helper-text">
            Demo login: <strong>testuser</strong> / <strong>Test123!</strong>
          </p>
        </form>
      </div>
    </div>
  );
}

