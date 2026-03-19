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
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");

  const themeLabel = theme === "light" ? "Dark mode" : "Light mode";

  const handleSearch = (query: string) => {
    setVaultSearchQuery(query);
    if (query.trim()) {
      setActiveView("clientVault");
    }
  };

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
          onAddPassword={() => setActiveView("clientVault")}
          onGeneratePassword={() => setActiveView("generator")}
          onSearch={handleSearch}
        />

        <div className="dashboard-content">
          {activeView === "dashboard" && (
            <>
              <div className="welcome-section">
                <h2 className="dashboard-title">Welcome back, {username}!</h2>
                <p className="dashboard-subtitle">
                  You have successfully logged in {mfaEnabled ? "with MFA." : "."}
                </p>
              </div>

              <StatsCards currentUser={username} />

              <div className="dashboard-grid">
                <div className="grid-col-2">
                  <RecentPasswords currentUser={username} />
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
                    onAddPassword={() => setActiveView("clientVault")}
                    onExportPasswords={() => setActiveView("clientVault")}
                    onRunAudit={() => setActiveView("security")}
                  />
                </div>
              </div>
            </>
          )}

          {activeView === "generator" && (
            <div className="generator-page">
              <h2 className="dashboard-title">Password Generator</h2>
              <div className="generator-wrapper">
                <PasswordGenerator currentUser={username} />
              </div>
            </div>
          )}

          {activeView === "clientVault" && (
            <div className="client-vault-wrapper">
              <ClientVault currentUser={username} searchQuery={vaultSearchQuery} />
            </div>
          )}

          {activeView === "security" && (
            <div className="security-page">
              <SecurityOverview expanded={true} />
            </div>
          )}

          {activeView === "settings" && (
            <div className="settings-page">
              <h2 className="dashboard-title">Settings</h2>
              <p className="dashboard-subtitle">
                Configure your account preferences
              </p>

              <div className="settings-layout">
                <div className="settings-card">
                  <h3 className="settings-section-title">Appearance</h3>
                  <p className="settings-section-subtitle">
                    Switch between light and dark themes.
                  </p>
                  <button className="theme-toggle" onClick={onToggleTheme}>
                    {themeLabel}
                  </button>
                </div>

                <div className="settings-card">
                  <h3 className="settings-section-title">Account</h3>
                  <p className="settings-section-subtitle">
                    Sign out of your SecureVault session.
                  </p>
                  {onLogout && (
                    <button className="logout-btn" onClick={onLogout}>
                      Logout
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
