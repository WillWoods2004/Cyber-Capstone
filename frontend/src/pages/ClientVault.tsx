import VaultPanel from "../components/VaultPanel";

type ClientVaultProps = {
  currentUser: string;
  searchQuery?: string;
};

export default function ClientVault({
  currentUser,
  searchQuery = "",
}: ClientVaultProps) {
  return (
    <div className="client-vault-page">
      <div className="client-vault-header">
        <div>
          <h2 className="dashboard-title">Client-Encrypted Vault</h2>
          <p className="dashboard-subtitle">
            Generate passwords and store secrets locally-encrypted before they
            ever touch the server. Use this vault to manage and sync encrypted
            entries without sending plaintext password material over the
            network.
          </p>
        </div>
      </div>

      <div className="client-vault-grid">
        <div className="client-vault-card">
          <VaultPanel currentUser={currentUser} searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}
