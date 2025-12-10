import { FormEvent, useEffect, useState } from "react";

type VaultPanelProps = {
  onCloudSave?: (
    credentialId: string,
    accountUsername: string,
    accountPassword: string
  ) => void | Promise<void>;
};

type LocalCredential = {
  id: string;
  label: string;
  username: string;
  password: string;
  createdAt: string;
  synced?: boolean;
};

const LOCAL_STORAGE_KEY = "securitypass_local_vault";

export default function VaultPanel({ onCloudSave }: VaultPanelProps) {
  const [label, setLabel] = useState("");
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [credentials, setCredentials] = useState<LocalCredential[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load locally-stored credentials on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as LocalCredential[];
      if (Array.isArray(parsed)) {
        setCredentials(parsed);
      }
    } catch (err) {
      console.error("Failed to load local vault:", err);
    }
  }, []);

  // Persist to localStorage whenever the list changes
  useEffect(() => {
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(credentials)
      );
    } catch (err) {
      console.error("Failed to persist local vault:", err);
    }
  }, [credentials]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !accountUsername.trim() || !accountPassword.trim()) {
      return;
    }

    const id = `${label.trim()}-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const newCredential: LocalCredential = {
      id,
      label: label.trim(),
      username: accountUsername.trim(),
      password: accountPassword,
      createdAt,
    };

    setIsSaving(true);

    try {
      // Save locally first so UX is snappy
      setCredentials((prev) => [newCredential, ...prev]);

      // Optionally push to cloud
      if (onCloudSave) {
        try {
          await onCloudSave(id, newCredential.username, newCredential.password);
          setCredentials((prev) =>
            prev.map((c) =>
              c.id === id
                ? {
                    ...c,
                    synced: true,
                  }
                : c
            )
          );
        } catch (err) {
          console.error("Cloud save failed for credential:", id, err);
        }
      }

      // Clear form
      setLabel("");
      setAccountUsername("");
      setAccountPassword("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="vault-panel">
      <div className="vault-header">
        <h3 className="vault-title">Local Vault</h3>
        <p className="vault-subtitle">
          Store credentials locally in your browser. When enabled, entries can
          also be synced securely to your cloud vault.
        </p>
      </div>

      <form className="vault-form" onSubmit={handleAdd}>
        <div className="vault-form-row">
          <div className="vault-field">
            <label className="vault-label">Site / App name</label>
            <input
              className="vault-input"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Example: banking portal"
            />
          </div>

          <div className="vault-field">
            <label className="vault-label">Username / Email</label>
            <input
              className="vault-input"
              type="text"
              value={accountUsername}
              onChange={(e) => setAccountUsername(e.target.value)}
              placeholder="example@domain.com"
            />
          </div>
        </div>

        <div className="vault-form-row">
          <div className="vault-field">
            <label className="vault-label">Password</label>
            <input
              className="vault-input"
              type="password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              placeholder="Paste or type password"
            />
          </div>
        </div>

        <div className="vault-actions">
          <button
            type="submit"
            className="vault-save-btn"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save to local vault"}
          </button>
        </div>
      </form>

      <div className="vault-list">
        <h4 className="vault-list-title">Recent entries</h4>
        {credentials.length === 0 && (
          <p className="vault-empty">No credentials saved yet.</p>
        )}

        {credentials.length > 0 && (
          <ul className="vault-list-items">
            {credentials.map((cred) => (
              <li key={cred.id} className="vault-list-item">
                <div className="vault-list-main">
                  <div className="vault-list-label">{cred.label}</div>
                  <div className="vault-list-username">
                    {cred.username || "No username"}
                  </div>
                </div>
                <div className="vault-list-meta">
                  <span className="vault-list-date">
                    {new Date(cred.createdAt).toLocaleString()}
                  </span>
                  {cred.synced && (
                    <span className="vault-list-synced">Synced to cloud</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
