import { useEffect, useState } from "react";
import "./App.css";
import "./dashboard.css";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SessionTimeout from "./SessionTimeout";
import { useCrypto } from "./crypto/CryptoProvider";
import { clearSessionTokens } from "./auth/session";

type Screen = "login" | "register" | "mfa" | "dashboard";
type Theme = "light" | "dark";

const SESSION_TIMEOUT_MS = 90_000;
const SESSION_WARNING_MS = 30_000;

function App() {
  const { clearKey } = useCrypto();
  const [screen, setScreen] = useState<Screen>("login");
  const [currentUser, setCurrentUser] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [lastRegisteredUsername, setLastRegisteredUsername] = useState("");
  const [sessionWarningVisible, setSessionWarningVisible] = useState(false);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }

    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  function resetSessionState({ keepRegisteredUsername = true }: { keepRegisteredUsername?: boolean } = {}) {
    clearSessionTokens();
    clearKey();
    setCurrentUser("");
    setMfaEnabled(false);
    setSessionWarningVisible(false);
    setSessionTimedOut(false);

    if (!keepRegisteredUsername) {
      setLastRegisteredUsername("");
    }
  }

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  function handlePasswordOk(mfaFromApi: boolean, username: string) {
    setCurrentUser(username);
    setMfaEnabled(mfaFromApi);
    setSessionTimedOut(false);
    setSessionWarningVisible(false);
    setScreen("mfa");
  }

  function handleMfaOk() {
    setMfaEnabled(true);
    setSessionTimedOut(false);
    setSessionWarningVisible(false);
    setScreen("dashboard");
  }

  function handleShowRegister() {
    resetSessionState();
    setScreen("register");
  }

  function handleRegistered(username: string) {
    resetSessionState({ keepRegisteredUsername: false });
    setLastRegisteredUsername(username);
    setScreen("login");
  }

  function handleCancelRegister() {
    resetSessionState();
    setScreen("login");
  }

  function handleManualLogout() {
    resetSessionState();
    setScreen("login");
  }

  function handleSessionWarning() {
    setSessionTimedOut(false);
    setSessionWarningVisible(true);
  }

  function handleSessionActive() {
    setSessionWarningVisible(false);
  }

  function handleSessionTimeout() {
    resetSessionState();
    setSessionTimedOut(true);
    setScreen("login");
  }

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
            ? "Your vault was locked after inactivity. Sign in again to continue."
            : "Your vault will auto-lock in 30 seconds without activity."}
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
          <Register onRegistered={handleRegistered} onCancel={handleCancelRegister} />
        </div>
      )}

      {screen === "mfa" && (
        <div className="min-h-screen flex items-center justify-center">
          <MFAVerify username={currentUser} enrolled={mfaEnabled} onMfaOk={handleMfaOk} />
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
