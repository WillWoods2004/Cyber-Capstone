import { useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import Register from "./pages/Register";

type Screen = "login" | "register" | "mfa" | "dashboard";

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState<string>("");
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [lastRegisteredUsername, setLastRegisteredUsername] =
    useState<string>("");

  const handlePasswordOk = (mfaFromApi: boolean, username: string) => {
    setCurrentUser(username);
    setMfaEnabled(mfaFromApi);

    // Always go to MFA, but pass whether user is already enrolled
    setScreen("mfa");
  };

  const handleMfaOk = () => {
    setMfaEnabled(true);
    setScreen("dashboard");
  };

  const handleShowRegister = () => {
    setScreen("register");
  };

  const handleRegistered = (username: string) => {
    setLastRegisteredUsername(username);
    setScreen("login");
  };

  const handleCancelRegister = () => {
    setScreen("login");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      {screen === "login" && (
        <Login
          onPasswordOk={handlePasswordOk}
          onShowRegister={handleShowRegister}
          initialUsername={lastRegisteredUsername}
        />
      )}

      {screen === "register" && (
        <Register
          onRegistered={handleRegistered}
          onCancel={handleCancelRegister}
        />
      )}

      {screen === "mfa" && (
        <MFAVerify
          username={currentUser}
          enrolled={mfaEnabled}
          onMfaOk={handleMfaOk}
        />
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
