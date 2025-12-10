import { useEffect, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";

const API_BASE = import.meta.env.VITE_API_BASE as string;

type VaultPanelProps = {
  onCloudSave?: (
    credentialId: string,
    username: string,
    password: string
  ) => void | Promise<void>;
};

type Row = CipherBlob & { _idx: number };

export default function VaultPanel({ onCloudSave }: VaultPanelProps) {
  const { isReady, encryptAndStore, listItems, decryptItem } = useCrypto();
  const [site, setSite] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{ site?: string; login?: string } | null>(null);

  async function refresh() {
    setBusy(true);
    setErr(null);
    setDecrypted(null);
    setSelectedMeta(null);
    try {
      const items = await listItems();
      setRows(items.map((it, i) => ({ ...it, _idx: i })));
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const meta: Record<string, unknown> = {
        createdAt: new Date().toISOString(),
      };
      const siteVal = site.trim();
      const loginVal = login.trim();
      if (siteVal) meta.site = siteVal;
      if (loginVal) meta.login = loginVal;

      // Encrypt and store in the client vault (existing behavior)
      await encryptAndStore(password, {
        ...meta,
      });

      // NEW: optionally sync to cloud, without affecting local behavior
      if (onCloudSave) {
        const credentialId = `${siteVal || "item"}-${Date.now()}`;
        try {
          await onCloudSave(credentialId, loginVal || "", password);
        } catch (e) {
          console.error("Cloud save failed:", e);
          // Intentionally do not rethrow so the local vault UX is unaffected
        }
      }

      setSite("");
      setLogin("");
      setPassword("");
      setDecrypted(null);
      setSelectedMeta(null);
      await refresh();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id?: string) {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${API_BASE}/vault/items/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
      if (decrypted) {
        setDecrypted(null);
        setSelectedMeta(null);
      }
      await refresh();
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (isReady) void refresh();
  }, [isReady]);

  if (!isReady) return <div className="muted">Login to derive your vault key…</div>;

  return (
    <div className="vault">
      <div className="vault-toolbar">
        <input
          className="vault-input"
          placeholder="Website (e.g., gmail.com)"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        />
        <input
          className="vault-input"
          placeholder="Login / email (e.g., user@gmail.com)"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          className="vault-input"
          type="password"
          placeholder="Password to encrypt"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={save}
          disabled={busy || !password.trim()}
        >
          Save
        </button>
        <button className="btn" onClick={refresh} disabled={busy}>
          Refresh
        </button>
      </div>

      {err && <div className="error">{err}</div>}
      <div className="muted small" style={{ marginBottom: 8 }}>
        Password is required. Site/login are optional but recommended so you can recognize the entry.
      </div>

      <div className="vault-table-wrap">
        <table className="vault-table">
          <thead>
            <tr>
              <th style={{ width: 160 }}>ID</th>
              <th>Site</th>
              <th>User / Email</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No items yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id ?? r._idx}>
                  <td className="vault-id" title={r.id ?? ""}>
                    {(r.id ?? "").slice(0, 8) || "-"}
                  </td>
                  <td className="vault-meta">{(r.meta as any)?.site ?? "-"}</td>
                  <td className="vault-meta">{(r.meta as any)?.login ?? "-"}</td>
                  <td className="vault-actions">
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        setDecrypted(await decryptItem(r));
                        setSelectedMeta({
                          site: (r.meta as any)?.site,
                          login: (r.meta as any)?.login,
                        });
                      }}
                      disabled={busy}
                    >
                      Decrypt
                    </button>
                    {r.id && (
                      <button className="btn btn-danger" onClick={() => remove(r.id)} disabled={busy}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {decrypted !== null && (
        <div className="vault-output">
          <div className="muted">
            {selectedMeta?.site ?? "Item"} — {selectedMeta?.login ?? "login not set"}
          </div>
          <div>
            <span className="muted">Decrypted password:</span>{" "}
            <code className="mono">{decrypted}</code>
            <button
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(decrypted);
                } catch {}
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
