import { useEffect, useState } from "react";
import "./App.css";
import "./dashboard.css";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

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

  const handleLogout = () => {
    setCurrentUser("");
    setMfaEnabled(false);
    setScreen("login");
  };

  const themeLabel = theme === "light" ? "Dark mode" : "Light mode";

  return (
    <div className="app-root">
      {/* Only show theme toggle on non-dashboard screens */}
      {screen !== "dashboard" && (
        <div className="theme-toggle-container">
          <button className="theme-toggle" onClick={toggleTheme}>
            {themeLabel}
          </button>
        </div>
      )}

      {/* Conditional rendering based on screen */}
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
            mfaEnabled={mfaEnabled}
            onMfaOk={handleMfaOk}
            onCancel={() => setScreen("login")}
          />
        </div>
      )}

      {screen === "dashboard" && (
        <Dashboard
          username={currentUser}
          mfaEnabled={mfaEnabled}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
}

export default App;
