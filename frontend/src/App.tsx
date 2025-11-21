import { useEffect, useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import Register from "./pages/Register";
import PasswordGenerator from "./components/PasswordGenerator";

type Screen = "login" | "register" | "mfa" | "dashboard";
type Theme = "light" | "dark";

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState<string>("");
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [lastRegisteredUsername, setLastRegisteredUsername] =
    useState<string>("");

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Called by Login.tsx when password is correct
  const handlePasswordOk = (mfaFromApi: boolean, username: string) => {
    setCurrentUser(username);
    setMfaEnabled(mfaFromApi);
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

  const themeLabel = theme === "light" ? "Dark mode" : "Light mode";

  return (
    <div className="app-root">
      {/* theme toggle bar – added for our part */}
      <div className="theme-toggle-container">
        <button className="theme-toggle" onClick={toggleTheme}>
          {themeLabel}
        </button>
      </div>

      {/* original layout, kept but wrapped inside app-root */}
      <div className="min-h-screen flex items-center justify-center">
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
            <div className="auth-card auth-card-dashboard">
              <h1 className="auth-title">Welcome!</h1>
              <p className="auth-subtitle">
                You have successfully logged in
                {mfaEnabled ? " with MFA." : "."}
              </p>
              <p className="helper-text">
                Logged in as <strong>{currentUser}</strong>
              </p>

              {/* our password generator feature */}
              <PasswordGenerator />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
