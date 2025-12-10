import VaultPanel from "../components/VaultPanel";

type ClientVaultProps = {
  onCloudSave?: (
    credentialId: string,
    accountUsername: string,
    accountPassword: string
  ) => Promise<void>;
};

export default function ClientVault({ onCloudSave }: ClientVaultProps) {
  return (
    <div className="client-vault-page">
      <div className="client-vault-header">
        <div>
          <h2 className="dashboard-title">Client-Encrypted Vault</h2>
          <p className="dashboard-subtitle">
            Generate passwords and store secrets locally-encrypted before they
            ever touch the server.
          </p>
        </div>
      </div>

      <div className="client-vault-grid">
        {/* Removed only the PasswordGenerator card — everything else untouched */}
        <div className="client-vault-card">
          {/* ✅ Pass AWS save hook into the vault panel */}
          <VaultPanel onCloudSave={onCloudSave} />
        </div>
      </div>
    </div>
  );
}
