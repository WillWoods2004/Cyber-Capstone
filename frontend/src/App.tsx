import { useEffect, useState } from "react";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import "./App.css";

type Screen = "login" | "mfa" | "dashboard";
type Theme = "light" | "dark";

function App() {
  const [screen, setScreen] = useState<Screen>("login");

  // Load the user's theme (or use system preference)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";

    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // Apply theme to <html> whenever it changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handlePasswordOk = () => {
    setScreen("mfa");
  };

  const handleMfaOk = () => {
    setScreen("dashboard");
  };

  return (
    <div className="app-root">
      {/* Top-right theme toggle */}
      <div className="theme-toggle-container">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
      </div>

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
