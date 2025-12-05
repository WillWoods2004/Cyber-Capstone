type QuickActionsProps = {
  onGeneratePassword: () => void;
};

export default function QuickActions({ onGeneratePassword }: QuickActionsProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Quick Actions</h3>
      </div>
      <div className="panel-content">
        <div className="quick-actions-list">
          <button className="quick-action-btn quick-action-primary">
            <span>➕</span>
            <span>Add New Password</span>
          </button>
          <button className="quick-action-btn" onClick={onGeneratePassword}>
            <span>🔑</span>
            <span>Generate Password</span>
          </button>
          <button className="quick-action-btn">
            <span>📥</span>
            <span>Export Passwords</span>
          </button>
          <button className="quick-action-btn">
            <span>🛡️</span>
            <span>Run Security Audit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
