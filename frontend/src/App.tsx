import { useEffect, useState } from "react";
import "./App.css";
import "./dashboard.css";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SessionTimeout from "./SessionTimeout";

type Screen = "login" | "register" | "mfa" | "dashboard";
type Theme = "light" | "dark";

const SESSION_TIMEOUT_MS = 90_000;
const SESSION_WARNING_MS = 30_000;

function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState<string>("");
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [lastRegisteredUsername, setLastRegisteredUsername] =
    useState<string>("");
  const [sessionWarningVisible, setSessionWarningVisible] =
    useState<boolean>(false);
  const [sessionTimedOut, setSessionTimedOut] = useState<boolean>(false);

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

  const handlePasswordOk = (mfaFromApi: boolean, username: string) => {
    setCurrentUser(username);
    setMfaEnabled(mfaFromApi);
    setSessionTimedOut(false);
    setSessionWarningVisible(false);
    setScreen("mfa");
  };

  const handleMfaOk = () => {
    setMfaEnabled(true);
    setSessionTimedOut(false);
    setSessionWarningVisible(false);
    setScreen("dashboard");
  };

  const handleShowRegister = () => {
    setSessionWarningVisible(false);
    setScreen("register");
  };

  const handleRegistered = (username: string) => {
    setLastRegisteredUsername(username);
    setSessionWarningVisible(false);
    setScreen("login");
  };

  const handleCancelRegister = () => {
    setSessionWarningVisible(false);
    setScreen("login");
  };

  const handleManualLogout = () => {
    setCurrentUser("");
    setMfaEnabled(false);
    setSessionWarningVisible(false);
    setSessionTimedOut(false);
    setScreen("login");
  };

  const handleSessionWarning = () => {
    setSessionTimedOut(false);
    setSessionWarningVisible(true);
  };

  const handleSessionActive = () => {
    setSessionWarningVisible(false);
  };

  const handleSessionTimeout = () => {
    setCurrentUser("");
    setMfaEnabled(false);
    setSessionWarningVisible(false);
    setSessionTimedOut(true);
    setScreen("login");
  };

  const themeLabel = theme === "light" ? "Dark mode" : "Light mode";

  return (
    <div className="app-root">
      {screen === "dashboard" && (
        <SessionTimeout
          enabled={true}
          timeoutMs={SESSION_TIMEOUT_MS}
          warningMs={SESSION_WARNING_MS}
          onWarning={handleSessionWarning}
          onActive={handleSessionActive}
          onTimeout={handleSessionTimeout}
        />
      )}

      {(sessionWarningVisible || sessionTimedOut) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            backgroundColor: "#c62828",
            color: "#ffffff",
            textAlign: "center",
            padding: "12px 16px",
            fontWeight: 700,
            zIndex: 9999,
            boxSizing: "border-box",
          }}
        >
          {sessionTimedOut
            ? "Your session has timed out"
            : "Your session will expire in 30 seconds"}
        </div>
      )}

      {screen !== "dashboard" && (
        <div className="theme-toggle-container">
          <button className="theme-toggle" onClick={toggleTheme}>
            {themeLabel}
          </button>
        </div>
      )}

      {screen === "login" && (
        <div className="min-h-screen flex items-center justify-center">
          <Login
            onPasswordOk={handlePasswordOk}
            onShowRegister={handleShowRegister}
            initialUsername={lastRegisteredUsername}
          />
        </div>
      )}

      {screen === "register" && (
        <div className="min-h-screen flex items-center justify-center">
          <Register
            onRegistered={handleRegistered}
            onCancel={handleCancelRegister}
          />
        </div>
      )}

      {screen === "mfa" && (
        <div className="min-h-screen flex items-center justify-center">
          <MFAVerify
            username={currentUser}
            enrolled={mfaEnabled}
            onMfaOk={handleMfaOk}
          />
        </div>
      )}

      {screen === "dashboard" && (
        <Dashboard
          username={currentUser}
          mfaEnabled={mfaEnabled}
          onLogout={handleManualLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

export default App;
