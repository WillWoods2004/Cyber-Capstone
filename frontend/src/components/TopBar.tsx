type TopBarProps = {
  onAddPassword: () => void;
  onGeneratePassword: () => void;
};

export default function TopBar({
  onAddPassword,
  onGeneratePassword,
}: TopBarProps) {
  return (
    <div className="topbar">
      <div className="topbar-search">
        {/* Search icon on the left of the input */}
        <span className="search-icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="text"
          placeholder="Search passwords, websites, usernames..."
          className="topbar-search-input"
        />
      </div>

      <div className="topbar-actions">
        {/* Notification icon / badge – empty text so nothing weird shows */}
        <button className="topbar-icon-btn" aria-label="Notifications">
          <span className="notification-badge" aria-hidden="true" />
        </button>

        <button
          className="topbar-add-btn secondary"
          onClick={onGeneratePassword}
        >
          <span>⚡</span>
          <span>Generator</span>
        </button>

        <button className="topbar-add-btn" onClick={onAddPassword}>
          <span>＋</span>
          <span>Add Password</span>
        </button>
      </div>
    </div>
  );
}
