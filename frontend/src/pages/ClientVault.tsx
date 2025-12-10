import VaultPanel from "../components/VaultPanel";

export default function ClientVault() {
  return (
    <div className="client-vault-page">
      <div className="client-vault-header">
        <div>
          <h2 className="dashboard-title">Client-Encrypted Vault</h2>
          <p className="dashboard-subtitle">
            Generate passwords and store secrets locally-encrypted before they ever touch the server.
          </p>
        </div>
      </div>

      <div className="client-vault-grid">
        {/* Removed only the PasswordGenerator card — everything else untouched */}
        <div className="client-vault-card">
          <VaultPanel />
        </div>
      </div>
    </div>
  );
}
