import { useState } from "react";

export default function RecentPasswords() {
  const [showPassword, setShowPassword] = useState<{ [key: number]: boolean }>({});

  const passwords = [
    { site: "GitHub", username: "artuaka2026", category: "Work", lastUsed: "2 hours ago", strength: "strong" },
    { site: "Gmail", username: "artuaka@example.com", category: "Personal", lastUsed: "1 day ago", strength: "strong" },
    { site: "Netflix", username: "artuaka2026", category: "Entertainment", lastUsed: "3 days ago", strength: "medium" },
    { site: "Amazon", username: "artuaka@example.com", category: "Shopping", lastUsed: "5 days ago", strength: "weak" },
  ];

  const togglePassword = (idx: number) => {
    setShowPassword((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Recent Passwords</h3>
        <button className="panel-link">View All →</button>
      </div>
      <div className="panel-content">
        <div className="password-list">
          {passwords.map((pwd, idx) => (
            <div key={idx} className="password-item">
              <div className="password-item-left">
                <div className="password-avatar">🔒</div>
                <div>
                  <p className="password-site">{pwd.site}</p>
                  <p className="password-username">{pwd.username}</p>
                </div>
              </div>
              <div className="password-item-right">
                <span className={`password-badge badge-${pwd.strength}`}>{pwd.strength}</span>
                <span className="password-time">{pwd.lastUsed}</span>
                <button className="password-toggle" onClick={() => togglePassword(idx)}>
                  {showPassword[idx] ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
