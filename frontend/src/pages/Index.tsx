// Front-End/frontend/src/pages/Index.tsx
import { useState } from "react";
import Login from "./Login";

type AuthUser = {
  email?: string;
  username?: string;
};

export default function IndexPage() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        return JSON.parse(storedUser) as AuthUser;
      } catch {
        localStorage.removeItem("authUser");
      }
    }
    return null;
  });
  const [isAuthed, setIsAuthed] = useState(() => user !== null);

  // Called when Login.tsx says authentication succeeded
  const handlePasswordOk = (_mfaFromApi: boolean, username: string) => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        const parsed: AuthUser = JSON.parse(storedUser);
        setUser(parsed);
      } catch {
        setUser({ username });
      }
    } else {
      setUser({ username });
    }
    setIsAuthed(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("authToken");
    setUser(null);
    setIsAuthed(false);
  };

  // If not logged in yet → show login form
  if (!isAuthed) {
    return (
      <div className="app-root">
        <div className="center-content">
          <Login
            onPasswordOk={handlePasswordOk}
            onShowRegister={() => {}}
          />
        </div>
      </div>
    );
  }

  // Logged in screen:
  const displayName =
    user?.email || user?.username || "Authenticated user";

  return (
    <div className="app-root">
      <div className="center-content">
        <div className="card-wrapper">
          <div className="auth-card">
            <h2 className="auth-overline">SecurityPass</h2>
            <h1 className="auth-title">Welcome!</h1>
            <p className="auth-subtitle">
              You have successfully logged in.
            </p>

            <p className="helper-text" style={{ marginTop: "1rem" }}>
              Logged in as <strong>{displayName}</strong>
            </p>

            <button
              type="button"
              className="primary-btn"
              style={{ marginTop: "1.5rem" }}
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
