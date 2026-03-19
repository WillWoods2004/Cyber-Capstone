type QuickActionsProps = {
  onGeneratePassword: () => void;
  onAddPassword: () => void;
  onRunAudit: () => void;
};

export default function QuickActions({
  onGeneratePassword,
  onAddPassword,
  onRunAudit,
}: QuickActionsProps) {
  return (
    <div className="quick-actions">
      <h3 className="quick-actions-title">Quick Actions</h3>

      <button className="quick-action-btn primary" onClick={onAddPassword}>
        <span>＋</span>
        <span>Add New Password</span>
      </button>

      <button className="quick-action-btn" onClick={onGeneratePassword}>
        <span>🔑</span>
        <span>Generate Password</span>
      </button>

      <button className="quick-action-btn" onClick={onRunAudit}>
        <span>🛡️</span>
        <span>Run Security Audit</span>
      </button>
    </div>
  );
}
