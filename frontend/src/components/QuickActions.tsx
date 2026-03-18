type QuickActionsProps = {
  onGeneratePassword: () => void;
  onAddPassword?: () => void;
  onExportPasswords?: () => void;
  onRunAudit?: () => void;
};

export default function QuickActions({
  onGeneratePassword,
  onAddPassword,
  onExportPasswords,
  onRunAudit,
}: QuickActionsProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Quick Actions</h3>
      </div>
      <div className="panel-content">
        <div className="quick-actions-list">
          <button className="quick-action-btn quick-action-primary" onClick={onAddPassword}>
            <span>Plus</span>
            <span>Add New Password</span>
          </button>

          <button className="quick-action-btn" onClick={onGeneratePassword}>
            <span>Key</span>
            <span>Generate Password</span>
          </button>

          <button className="quick-action-btn" onClick={onExportPasswords}>
            <span>Export</span>
            <span>Export Passwords</span>
          </button>

          <button className="quick-action-btn" onClick={onRunAudit}>
            <span>Audit</span>
            <span>Run Security Audit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
