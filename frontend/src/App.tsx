import { useEffect, useState } from "react";
import Login from "./pages/Login";
import MFAVerify from "./pages/MFAVerify";
import "./App.css";

type Screen = "login" | "mfa" | "dashboard";
type Theme = "light" | "dark";

function App() {
  const [screen, setScreen] = useState<Screen>("login");

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";

    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }

    const prefersDark = window.matchMedia &&
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

  const handlePasswordOk = () => {
    setScreen("mfa");
  };

  const handleMfaOk = () => {
    setScreen("dashboard");
  };

  const themeLabel = theme === "light" ? "Dark mode" : "Light mode";

  return (
    <div className="app-root">
      <div className="theme-toggle-container">
        <button className="theme-toggle" onClick={toggleTheme}>
          {themeLabel}
        </button>
      </div>

      <div className="center-content">
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
    </div>
  );
}

export default App;
