type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  username: string;
};

export default function Sidebar({ isOpen, onToggle, activeView, onViewChange, username }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", icon: "🏠", label: "Dashboard" },
    { id: "passwords", icon: "🔒", label: "Passwords" },
    { id: "generator", icon: "🔑", label: "Generator" },
    { id: "security", icon: "🛡️", label: "Security" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {/* Logo & Toggle */}
      <div className="sidebar-header">
        {isOpen && <h1 className="sidebar-logo">SecureVault</h1>}
        <button className="sidebar-toggle" onClick={onToggle}>
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`sidebar-item ${activeView === item.id ? "sidebar-item-active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {isOpen && <span className="sidebar-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">👤</div>
          {isOpen && (
            <div className="sidebar-user-info">
              <p className="sidebar-username">{username}</p>
              <p className="sidebar-plan">Premium Plan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
