// Front-End/frontend/src/pages/MFAVerify.tsx

import { useEffect, useState } from "react";
import { ErrorBox } from "../components/Error";

const API_BASE =
  "https://y1o1g8ogfh.execute-api.us-east-1.amazonaws.com/prod";

interface Props {
  username: string;
  enrolled: boolean; // from backend login (mfaEnabled)
  onMfaOk: () => void;
}

type Mode = "setup" | "verify";

export default function MFAVerify({ username, enrolled, onMfaOk }: Props) {
  const [mode, setMode] = useState<Mode>(enrolled ? "verify" : "setup");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [qrUrl, setQrUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");

  // First-time setup: ask backend for secret + otpauth URL
  useEffect(() => {
    const startSetup = async () => {
      if (mode !== "setup") return;

      setError("");
      setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/mfa/setup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        });

        const data: any = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          setError(
            data.message ||
              "Failed to start MFA setup. Please try again or contact support."
          );
          return;
        }

        const otpAuthUrl: string =
          data.otpAuthUrl || data.otpauthUrl || "";

        const secretBase32: string = data.secret || "";
        setSecret(secretBase32);

        if (otpAuthUrl) {
          // Use a simple public QR service for dev
          const url =
            "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" +
            encodeURIComponent(otpAuthUrl);
          setQrUrl(url);
        }
      } catch (err) {
        console.error("MFA setup network error:", err);
        setError("Network error while starting MFA setup.");
      } finally {
        setLoading(false);
      }
    };

    startSetup();
  }, [mode, username]);

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

      // Verified – proceed to dashboard
      onMfaOk();
    } catch (err) {
      console.error("MFA verify network error:", err);
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const isSetup = mode === "setup";

  return (
    <div className="card-wrapper">
      <div className="auth-card">
        <h2 className="auth-overline">SECURITYPASS</h2>
        <h1 className="auth-title">
          {isSetup ? "Set up MFA" : "Enter MFA Code"}
        </h1>
        <p className="auth-subtitle">
          {isSetup
            ? "Scan the QR code in Microsoft Authenticator, then enter the 6-digit code."
            : "Check your Authenticator app and enter the current 6-digit code."}
        </p>

        <ErrorBox message={error} />

        {isSetup && (
          <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
            {qrUrl ? (
              <>
                <img
                  src={qrUrl}
                  alt="Scan with your Authenticator app"
                  style={{
                    display: "block",
                    margin: "0 auto 0.75rem",
                    borderRadius: "8px",
                  }}
                />
                {secret && (
                  <p className="helper-text">
                    If you can&apos;t scan the QR, manually enter this key in
                    your Authenticator app:{" "}
                    <strong>{secret}</strong>
                  </p>
                )}
              </>
            ) : (
              <p className="helper-text">
                {loading
                  ? "Preparing your MFA setup…"
                  : "Unable to load QR code. You can still use the manual key below."}
              </p>
            )}
          </div>
        )}

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
