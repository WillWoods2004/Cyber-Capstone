import { useEffect, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";

const API_BASE = import.meta.env.VITE_API_BASE as string;

type Row = CipherBlob & { _idx: number };

export default function VaultPanel() {
  const { isReady, encryptAndStore, listItems, decryptItem } = useCrypto();
  const [secret, setSecret] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setErr(null);
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
      await encryptAndStore(secret, { createdAt: new Date().toISOString() });
      setSecret("");
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
      if (decrypted) setDecrypted(null);
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
          placeholder="Secret to store (client-encrypted)"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
        <button className="btn btn-primary" onClick={save} disabled={busy || !secret.trim()}>
          Save
        </button>
        <button className="btn" onClick={refresh} disabled={busy}>
          Refresh
        </button>
      </div>

      {err && <div className="error">{err}</div>}

      <div className="vault-table-wrap">
        <table className="vault-table">
          <thead>
            <tr>
              <th style={{ width: 160 }}>ID</th>
              <th>Meta</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">
                  No items yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id ?? r._idx}>
                  <td className="vault-id" title={r.id ?? ""}>
                    {(r.id ?? "").slice(0, 8) || "—"}
                  </td>
                  <td className="vault-meta">
                    <code className="mono small">
                      {JSON.stringify(r.meta ?? {}, null, 0)}
                    </code>
                  </td>
                  <td className="vault-actions">
                    <button
                      className="btn btn-primary"
                      onClick={async () => setDecrypted(await decryptItem(r))}
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
          <span className="muted">Decrypted:</span>{" "}
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
      )}
    </div>
  );
}
