import { useState } from "react";
import { ErrorBox } from "../components/Error";

interface Props {
  username: string;
  onMfaOk: () => void;
}

export default function MFAVerify({ username, onMfaOk }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod/mfa/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, code }),
        }
      );

      const data = await response.json();
      console.log("MFA API result:", data);

      if (!response.ok || data.success === false) {
        setError(data.message || "Invalid authentication code.");
        setLoading(false);
        return;
      }

      // Success → let the app move to the dashboard
      onMfaOk();
    } catch (err) {
      console.error(err);
      setError("Network error. Try again.");
    }

    setLoading(false);
  };

  return (
    <div className="card-wrapper">
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
            disabled={loading}
          />

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
