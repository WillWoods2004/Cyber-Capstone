// Front-End/frontend/src/pages/MFAVerify.tsx

import { useState } from "react";
import { ErrorBox } from "../components/Error";

const API_BASE =
  "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod";

interface Props {
  username: string;
  onMfaOk: () => void;
}

export default function MFAVerify({ username, onMfaOk }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Please enter the code from your Authenticator app.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_BASE}/mfa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, code }),
      });

      const data: any = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setError(
          data.message || "Invalid MFA code. Please try again."
        );
        return;
      }

      // MFA verified successfully → go to dashboard
      onMfaOk();
    } catch (err) {
      console.error("MFA verify network error:", err);
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-wrapper">
      <div className="auth-card">
        <h2 className="auth-overline">SECURITYPASS</h2>
        <h1 className="auth-title">Enter MFA Code</h1>
        <p className="auth-subtitle">Check your Authenticator app.</p>

        <ErrorBox message={error} />

        <form onSubmit={handleVerify} className="auth-form">
          <div className="form-field">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="text-center tracking-[0.4em]"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="primary-btn"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
