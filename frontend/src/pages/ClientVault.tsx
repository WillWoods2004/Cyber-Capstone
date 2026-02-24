import VaultPanel from "../components/VaultPanel";

type ClientVaultProps = {
  currentUser: string;
  onCloudSave?: (
    credentialId: string,
    accountUsername: string,
    accountPassword: string
  ) => void | Promise<void>;
};

export default function ClientVault({
  currentUser,
  onCloudSave,
}: ClientVaultProps) {
  return (
    <div className="client-vault-page">
      <div className="client-vault-header">
        <div>
          <h2 className="dashboard-title">Client-Encrypted Vault</h2>
          <p className="dashboard-subtitle">
            Generate passwords and store secrets locally-encrypted before they
            ever touch the server. Use this vault to manage your encrypted
            entries and optionally sync selected ones to your secure cloud
            vault.
          </p>
        </div>
      </div>

      <div className="client-vault-grid">
        <div className="client-vault-card">
          <VaultPanel
            currentUser={currentUser}
            onCloudSave={onCloudSave}
          />
        </div>
      </div>
    </div>
  );
}
