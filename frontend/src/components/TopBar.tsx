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
        <span className="search-icon">dY"?</span>
        <input
          type="text"
          placeholder="Search passwords, websites, usernames..."
          className="topbar-search-input"
        />
      </div>

      <div className="topbar-actions">
        <button className="topbar-icon-btn">
          <span className="notification-badge">dY""</span>
        </button>
        <button className="topbar-add-btn secondary" onClick={onGeneratePassword}>
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
