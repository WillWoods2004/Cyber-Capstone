import { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import StatsCards from "../components/StatsCards";
import RecentPasswords from "../components/RecentPasswords";
import ActivityFeed from "../components/ActivityFeed";
import SecurityOverview from "../components/SecurityOverview";
import QuickActions from "../components/QuickActions";
import PasswordGenerator from "../components/PasswordGenerator";
import ClientVault from "./ClientVault";

type DashboardProps = {
  username: string;
  mfaEnabled: boolean;
  onLogout?: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

type ActiveView =
  | "dashboard"
  | "passwords"
  | "generator"
  | "clientVault"
  | "security"
  | "settings";

export default function Dashboard({
  username,
  mfaEnabled,
  onLogout,
  theme,
  onToggleTheme,
}: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");

  const themeLabel = theme === "light" ? "Dark mode" : "Light mode";

  return (
    <div className="dashboard-container">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeView={activeView}
        onViewChange={(view) => setActiveView(view as ActiveView)}
        username={username}
      />

      <div className="dashboard-main">
        <TopBar
          onAddPassword={() => alert("Add password functionality")}
          onGeneratePassword={() => setActiveView("generator")}
        />

        <div className="dashboard-content">
          {activeView === "dashboard" && (
            <>
              {/* Welcome Section */}
              <div className="welcome-section">
                <h2 className="dashboard-title">Welcome back, {username}!</h2>
                <p className="dashboard-subtitle">
                  You have successfully logged in {mfaEnabled ? "with MFA." : "."}
                </p>
              </div>

              {/* Stats Cards */}
              <StatsCards />

              {/* Main Grid */}
              <div className="dashboard-grid">
                <div className="grid-col-2">
                  <RecentPasswords />
                </div>
                <div className="grid-col-1">
                  <ActivityFeed />
                </div>
                <div className="grid-col-2">
                  <SecurityOverview />
                </div>
                <div className="grid-col-1">
                  <QuickActions
                    onGeneratePassword={() => setActiveView("generator")}
                  />
                </div>
              </div>
            </>
          )}

          {activeView === "generator" && (
            <div className="generator-page">
              <h2 className="dashboard-title">Password Generator</h2>
              <div className="generator-wrapper">
                <PasswordGenerator />
              </div>
            </div>
          )}

          {activeView === "clientVault" && (
            <div className="client-vault-wrapper">
              <ClientVault />
            </div>
          )}

          {activeView === "passwords" && (
            <div className="passwords-page">
              <h2 className="dashboard-title">All Passwords</h2>
              <p className="dashboard-subtitle">Manage your stored passwords</p>
              {/* Add your password vault component here */}
            </div>
          )}

          {activeView === "security" && (
            <div className="security-page">
              <h2 className="dashboard-title">Security Center</h2>
              <SecurityOverview expanded={true} />
            </div>
          )}

          {activeView === "settings" && (
            <div className="settings-page">
              <h2 className="dashboard-title">Settings</h2>
              <p className="dashboard-subtitle">
                Configure your account preferences
              </p>

              {/* Theme toggle inside Settings */}
              <div className="theme-toggle-container">
                <button className="theme-toggle" onClick={onToggleTheme}>
                  {themeLabel}
                </button>
              </div>

              {onLogout && (
                <button className="logout-btn" onClick={onLogout}>
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
