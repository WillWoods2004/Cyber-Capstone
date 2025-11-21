// Front-End/frontend/src/App.tsx

import { useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";

type Screen = "login" | "mfa" | "dashboard";

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState<string>("");
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);

  const handlePasswordOk = (mfaFromApi: boolean, username: string) => {
    setCurrentUser(username);
    setMfaEnabled(mfaFromApi);

    if (mfaFromApi) {
      setScreen("mfa");
    } else {
      // No MFA → go straight to dashboard
      setScreen("dashboard");
    }
  };

  const handleMfaOk = () => {
    setMfaEnabled(true);
    setScreen("dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      {screen === "login" && <Login onPasswordOk={handlePasswordOk} />}

      {screen === "mfa" && (
        <MFAVerify username={currentUser} onMfaOk={handleMfaOk} />
      )}

      {screen === "dashboard" && (
        <div className="card-wrapper">
          <div className="auth-card">
            <h1 className="auth-title">Welcome!</h1>
            <p className="auth-subtitle">
              You have successfully logged in
              {mfaEnabled ? " with MFA." : "."}
            </p>
            <p className="helper-text">
              Logged in as <strong>{currentUser}</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
