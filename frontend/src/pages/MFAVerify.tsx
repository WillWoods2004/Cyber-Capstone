import { useState } from "react";
import { ErrorBox } from "../components/Error";

interface Props {
  onMfaOk: () => void;
}

export default function MFAVerify({ onMfaOk }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (code === "123456") {
      onMfaOk();
    } else {
      setError("Invalid authentication code.");
    }
  };

  return (
    <div className="auth-card">
      <h1 className="auth-title">Enter MFA Code</h1>
      <p className="auth-subtitle">Check your Authenticator app.</p>

      <ErrorBox message={error} />

      <form onSubmit={handleSubmit} className="auth-form">
        <input
          maxLength={6}
          placeholder="123456"
          className="mfa-input"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
        />

        <button type="submit" className="primary-btn">
          Verify
        </button>
      </form>
    </div>
  );
}

