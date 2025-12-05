export default function StatsCards() {
  const stats = [
    { label: "Total Passwords", value: "47", icon: "🔒", color: "stat-blue" },
    { label: "Weak Passwords", value: "3", icon: "⚠️", color: "stat-orange" },
    { label: "Expiring Soon", value: "5", icon: "⏰", color: "stat-yellow" },
    { label: "Security Score", value: "87%", icon: "🛡️", color: "stat-green" },
  ];

  return (
    <div className="stats-grid">
      {stats.map((stat, idx) => (
        <div key={idx} className={`stat-card ${stat.color}`}>
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">{stat.icon}</span>
            </div>
            <span className="stat-trend">📈</span>
          </div>
          <p className="stat-label">{stat.label}</p>
          <p className="stat-value">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
