export default function ActivityFeed() {
  const activities = [
    { action: "Password added", detail: "GitHub account", time: "2 hours ago", icon: "➕" },
    { action: "Password updated", detail: "Gmail account", time: "1 day ago", icon: "🔑" },
    { action: "Security scan completed", detail: "3 weak passwords found", time: "2 days ago", icon: "🛡️" },
    { action: "Password accessed", detail: "Netflix account", time: "3 days ago", icon: "👁️" },
    { action: "Password generated", detail: "Length: 16 characters", time: "5 days ago", icon: "🔑" },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">📊</span>
        <h3 className="panel-title">Recent Activity</h3>
      </div>
      <div className="panel-content">
        <div className="activity-list">
          {activities.map((activity, idx) => (
            <div key={idx} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <p className="activity-action">{activity.action}</p>
                <p className="activity-detail">{activity.detail}</p>
                <p className="activity-time">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
