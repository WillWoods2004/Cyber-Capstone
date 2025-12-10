import { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import StatsCards from "../components/StatsCards";
import RecentPasswords from "../components/RecentPasswords";
import ActivityFeed from "../components/ActivityFeed";
import SecurityOverview from "../components/SecurityOverview";
import QuickActions from "../components/QuickActions";
import PasswordGenerator from "../components/PasswordGenerator";
import { saveCredentialToCloud } from "../api/saveCredential";

type DashboardProps = {
  username: string;
  mfaEnabled: boolean;
  onLogout?: () => void;
};

type ActiveView = "dashboard" | "passwords" | "generator" | "security" | "settings";

export default function Dashboard({
  username,
  mfaEnabled,
  onLogout,
}: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [showGeneratorModal, setShowGeneratorModal] = useState(false); // still unused but harmless

  // NEW: state for the "Add Password" form
  const [siteName, setSiteName] = useState("");
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSaveToCloud = async () => {
    if (!siteName || !accountUsername || !accountPassword) {
      setSaveStatus("❌ Please fill out all fields before saving.");
      return;
    }

    setSaveStatus("Saving...");

    const success = await saveCredentialToCloud(
      username,      // userId in DynamoDB
      siteName,      // credentialId (we're using site/app name)
      accountUsername,
      accountPassword
    );

    if (success) {
      setSaveStatus("✅ Password saved to AWS!");
      setSiteName("");
      setAccountUsername("");
      setAccountPassword("");
    } else {
      setSaveStatus("❌ Failed to save password.");
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeView={activeView}
        onViewChange={setActiveView}
        username={username}
      />

      <div className="dashboard-main">
        <TopBar
          // OLD: onAddPassword={() => alert("Add password functionality")}
          // NEW: go to the "passwords" view where our form lives
          onAddPassword={() => setActiveView("passwords")}
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

          {activeView === "passwords" && (
            <div className="passwords-page">
              <h2 className="dashboard-title">Save New Password</h2>
              <p className="dashboard-subtitle">
                Store your credentials securely in the cloud via AWS Lambda & DynamoDB.
              </p>

              <div className="generator-wrapper">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <input
                    placeholder="Website / App Name (e.g. GitHub)"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="topbar-search-input"
                  />

                  <input
                    placeholder="Account Username / Email"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    className="topbar-search-input"
                  />

                  <input
                    placeholder="Account Password"
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="topbar-search-input"
                  />

                  <button className="topbar-add-btn" onClick={handleSaveToCloud}>
                    Save to Cloud
                  </button>

                  {saveStatus && <p>{saveStatus}</p>}
                </div>
              </div>
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

