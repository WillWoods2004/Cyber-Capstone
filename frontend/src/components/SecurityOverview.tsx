type SecurityOverviewProps = {
  expanded?: boolean;
};

export default function SecurityOverview({ expanded: _expanded = false }: SecurityOverviewProps) {
  const securityIssues = [
    { type: "Weak Password", count: 3, severity: "high" },
    { type: "Duplicate Password", count: 2, severity: "medium" },
    { type: "Old Password (>90 days)", count: 5, severity: "low" },
  ];

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">🛡️</span>
        <h3 className="panel-title">Security Overview</h3>
      </div>
      <div className="panel-content">
        {/* Security Score */}
        <div className="security-score-section">
          <div className="security-score-header">
            <span className="security-score-label">Overall Security Score</span>
            <span className="security-score-value">87%</span>
          </div>
          <div className="security-progress-bar">
            <div className="security-progress-fill" style={{ width: "87%" }}></div>
          </div>
        </div>

        {/* Security Issues */}
        <div className="security-issues">
          {securityIssues.map((issue, idx) => (
            <div key={idx} className="security-issue">
              <div className="security-issue-left">
                <span className={`security-severity severity-${issue.severity}`}>⚠️</span>
                <div>
                  <p className="security-issue-type">{issue.type}</p>
                  <p className="security-issue-count">{issue.count} passwords affected</p>
                </div>
              </div>
              <button className="security-fix-btn">Fix Now</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
