import PasswordGenerator from "../components/PasswordGenerator";
import VaultPanel from "../components/VaultPanel";

type ClientVaultProps = {
  onCloudSave?: (
    credentialId: string,
    accountUsername: string,
    accountPassword: string
  ) => void | Promise<void>;
};

export default function ClientVault({ onCloudSave }: ClientVaultProps) {
  return (
    <div className="client-vault-page">
      <div className="client-vault-header">
        <div>
          <h2 className="dashboard-title">Client-Encrypted Vault</h2>
          <p className="dashboard-subtitle">
            Generate passwords and store secrets locally-encrypted before they
            ever touch the server. Optionally sync selected entries to your
            secure cloud vault.
          </p>
        </div>
      </div>

      <div className="client-vault-grid">
        <div className="client-vault-card">
          <PasswordGenerator />
        </div>
        <div className="client-vault-card">
          <VaultPanel onCloudSave={onCloudSave} />
        </div>
      </div>
    </div>
  );
}
