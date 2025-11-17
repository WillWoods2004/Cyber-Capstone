import { useState } from "react";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import "./App.css";

type Screen = "login" | "mfa" | "dashboard";

function App() {
  const [screen, setScreen] = useState<Screen>("login");

  const handlePasswordOk = () => {
    setScreen("mfa");
  };

  const handleMfaOk = () => {
    setScreen("dashboard");
  };

  return (
    <div className="app-root">
      {screen === "login" && <Login onPasswordOk={handlePasswordOk} />}

      {screen === "mfa" && (
        <div className="card-wrapper">
          <MFAVerify onMfaOk={handleMfaOk} />
        </div>
      )}

      {screen === "dashboard" && (
        <div className="card-wrapper">
          <div className="auth-card">
            <h1 className="auth-title">Welcome!</h1>
            <p className="auth-subtitle">
              You have successfully logged in with MFA.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
