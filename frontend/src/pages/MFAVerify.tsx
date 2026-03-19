import { useEffect, useState } from "react";
import { ErrorBox } from "../components/Error";
import { AUTH_API_BASE } from "../config/api";
import { clearChallengeToken, getChallengeToken, saveAuthToken } from "../auth/session";

interface Props {
  username: string;
  enrolled: boolean;
  onMfaOk: () => void;
}

type Mode = "setup" | "verify";

export default function MFAVerify({ username, enrolled, onMfaOk }: Props) {
  const [mode] = useState<Mode>(enrolled ? "verify" : "setup");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [mockCodeHint, setMockCodeHint] = useState("");

  useEffect(() => {
    const startSetup = async () => {
      if (mode !== "setup") {
        return;
      }

      const challengeToken = getChallengeToken();
      setError("");
      setLoading(true);

      try {
        const requestInit: RequestInit = challengeToken
          ? {
              method: "POST",
              headers: {
                Authorization: `Bearer ${challengeToken}`,
              },
            }
          : {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ username }),
            };

        const response = await fetch(`${AUTH_API_BASE}/mfa/setup`, requestInit);

        const data = await response.json().catch((): Record<string, unknown> => ({}));
        if (!response.ok || !data.success) {
          setError(
            (typeof data.message === "string" && data.message) ||
              "Failed to start MFA setup. Please try again or contact support."
          );
          return;
        }

        const otpAuthUrl: string = data.otpAuthUrl || data.otpauthUrl || "";
        setSecret(typeof data.secret === "string" ? data.secret : "");
        setMockCodeHint(typeof data.mockCode === "string" ? data.mockCode : "");

        if (otpAuthUrl) {
          setQrUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpAuthUrl)}`
          );
        }
      } catch (err) {
        console.error("MFA setup network error:", err);
        setError("Network error while starting MFA setup.");
      } finally {
        setLoading(false);
      }
    };

    void startSetup();
  }, [mode, username]);

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Please enter the code from your Authenticator app.");
      return;
    }

    const challengeToken = getChallengeToken();

    try {
      setLoading(true);

      const requestInit: RequestInit = challengeToken
        ? {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${challengeToken}`,
            },
            body: JSON.stringify({ code }),
          }
        : {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, code }),
          };

      const response = await fetch(`${AUTH_API_BASE}/mfa/verify`, requestInit);

      const data = await response.json().catch((): Record<string, unknown> => ({}));
      if (!response.ok || !data.success) {
        setError((typeof data.message === "string" && data.message) || "Invalid MFA code. Please try again.");
        return;
      }

      if (challengeToken && (typeof data.authToken !== "string" || !data.authToken)) {
        setError("MFA completed but the vault session token was missing. Sign in again.");
        return;
      }

      if (typeof data.authToken === "string" && data.authToken) {
        saveAuthToken(data.authToken);
      }
      clearChallengeToken();
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
        <h1 className="auth-title">{isSetup ? "Set up MFA" : "Enter MFA Code"}</h1>
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
                    If you can&apos;t scan the QR, manually enter this key in your Authenticator app:{" "}
                    <strong>{secret}</strong>
                  </p>
                )}
                {mockCodeHint && (
                  <p className="helper-text">
                    Local mock MFA code: <strong>{mockCodeHint}</strong>
                  </p>
                )}
              </>
            ) : (
              <p className="helper-text">
                {loading
                  ? "Preparing your MFA setup..."
                  : "Unable to load QR code. You can still use the manual key below."}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleVerify} className="auth-form">
          <div className="form-field">
            <label>MFA code for {username}</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mfa-input"
            />
          </div>

          <button type="submit" disabled={loading} className="primary-btn">
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
