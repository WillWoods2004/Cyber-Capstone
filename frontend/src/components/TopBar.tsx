import { useState } from "react";

type TopBarProps = {
  onAddPassword: () => void;
  onGeneratePassword: () => void;
  onSearch?: (query: string) => void;
};

export default function TopBar({
  onAddPassword,
  onGeneratePassword,
  onSearch,
}: TopBarProps) {
  const [query, setQuery] = useState("");

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="topbar">
      <div className="topbar-search">
        <span className="search-icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="text"
          placeholder="Search passwords, websites, usernames..."
          className="topbar-search-input"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-add-btn secondary"
          onClick={onGeneratePassword}
        >
          <span>⚡</span>
          <span>Generator</span>
        </button>

        <button
          type="button"
          className="topbar-add-btn"
          onClick={onAddPassword}
        >
          <span>＋</span>
          <span>Add Password</span>
        </button>
      </div>
    </div>
  );
}
