import { useEffect, useMemo, useRef, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";
import { VAULT_API_BASE } from "../config/api";

type Row = CipherBlob & { _idx: number };

type CryptoStage =
  | "idle"
  | "encrypting"
  | "encrypted"
  | "storing"
  | "stored"
  | "retrieving"
  | "decrypting"
  | "decrypted"
  | "error";

const TIMELINE_STEPS = [
  "Plaintext",
  "Encrypt",
  "Ciphertext",
  "Store",
  "Retrieve",
  "Decrypt",
  "Output",
] as const;

const utf8 = new TextEncoder();

function stageLabel(stage: CryptoStage): string {
  switch (stage) {
    case "encrypting":
      return "Encrypting on client";
    case "encrypted":
      return "Ciphertext generated";
    case "storing":
      return "Storing ciphertext";
    case "stored":
      return "Stored successfully";
    case "retrieving":
      return "Loading ciphertext";
    case "decrypting":
      return "Decrypting on client";
    case "decrypted":
      return "Decryption complete";
    case "error":
      return "Crypto error";
    default:
      return "Idle";
  }
}

function stageToStep(stage: CryptoStage): number {
  switch (stage) {
    case "encrypting":
      return 1;
    case "encrypted":
      return 2;
    case "storing":
    case "stored":
      return 3;
    case "retrieving":
      return 4;
    case "decrypting":
      return 5;
    case "decrypted":
      return 6;
    default:
      return 0;
  }
}

function base64ByteLength(b64?: string | null): number {
  if (!b64) return 0;
  try {
    return atob(b64).length;
  } catch {
    return 0;
  }
}

function shannonEntropy(text?: string | null): number {
  if (!text || text.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (const ch of text) freq[ch] = (freq[ch] ?? 0) + 1;

  const len = text.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export default function VaultPanel() {
  const { isReady, encryptOnly, storeCipherBlob, listItems, decryptItem } = useCrypto();
  const [site, setSite] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{ site?: string; login?: string } | null>(null);

  const [cryptoStage, setCryptoStage] = useState<CryptoStage>("idle");
  const [visualPlaintext, setVisualPlaintext] = useState<string | null>(null);
  const [visualCipher, setVisualCipher] = useState<CipherBlob | null>(null);
  const [visualDecrypted, setVisualDecrypted] = useState<string | null>(null);
  const [cryptoLog, setCryptoLog] = useState<string[]>([]);
  const [payloadSnapshot, setPayloadSnapshot] = useState<string>("");
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [ivReused, setIvReused] = useState<boolean | null>(null);
  const seenIvRef = useRef<Set<string>>(new Set());

  const activeStep = stageToStep(cryptoStage);

  const stats = useMemo(() => {
    const plaintextBytes = visualPlaintext ? utf8.encode(visualPlaintext).length : 0;
    const ctBytes = base64ByteLength(visualCipher?.ct ?? null);
    const ivBytes = base64ByteLength(visualCipher?.iv ?? null);
    const tagBytes = base64ByteLength(visualCipher?.tag ?? null);
    const plaintextEntropy = shannonEntropy(visualPlaintext);
    const ciphertextEntropy = shannonEntropy(visualCipher?.ct ?? null);

    return {
      plaintextBytes,
      ctBytes,
      ivBytes,
      tagBytes,
      plaintextEntropy,
      ciphertextEntropy,
    };
  }, [visualPlaintext, visualCipher]);

  function addLog(message: string) {
    const stamp = new Date().toLocaleTimeString();
    setCryptoLog((prev) => [`${stamp} - ${message}`, ...prev].slice(0, 12));
  }

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
      setCryptoStage("error");
      addLog(`Refresh failed: ${e.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!password.trim()) return;

    setBusy(true);
    setErr(null);
    setVisualDecrypted(null);
    setVisualPlaintext(password);
    setCryptoStage("encrypting");
    setIvReused(null);
    addLog("Encrypting plaintext in browser");

    try {
      const meta: Record<string, unknown> = {
        createdAt: new Date().toISOString(),
      };

      const siteVal = site.trim();
      const loginVal = login.trim();
      if (siteVal) meta.site = siteVal;
      if (loginVal) meta.login = loginVal;

      const blob = await encryptOnly(password, meta);
      const reused = seenIvRef.current.has(blob.iv);
      setIvReused(reused);
      if (!reused) seenIvRef.current.add(blob.iv);

      setVisualCipher(blob);
      setPayloadSnapshot(
        JSON.stringify(
          {
            method: "POST",
            endpoint: `${VAULT_API_BASE}/vault/items`,
            body: {
              ct: blob.ct,
              iv: blob.iv,
              tag: blob.tag,
              meta: blob.meta ?? {},
            },
          },
          null,
          2
        )
      );

      setCryptoStage("encrypted");
      addLog("Generated ct / iv / tag on client");

      setCryptoStage("storing");
      addLog("Posting ciphertext payload to vault API");
      await storeCipherBlob(blob);

      setCryptoStage("stored");
      addLog("Ciphertext stored successfully");

      setSite("");
      setLogin("");
      setPassword("");
      setDecrypted(null);
      setSelectedMeta(null);
      await refresh();
    } catch (e: any) {
      setErr(e.message ?? String(e));
      setCryptoStage("error");
      addLog(`Save failed: ${e.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecrypt(r: Row) {
    setBusy(true);
    setErr(null);
    setCryptoStage("retrieving");
    setVisualCipher({ id: r.id, ct: r.ct, iv: r.iv, tag: r.tag, meta: r.meta });
    setVisualPlaintext(null);
    setPayloadSnapshot(
      JSON.stringify(
        {
          action: "DECRYPT_IN_BROWSER",
          sourceItemId: r.id ?? null,
          payload: {
            ct: r.ct,
            iv: r.iv,
            tag: r.tag,
            meta: r.meta ?? {},
          },
        },
        null,
        2
      )
    );

    addLog(`Loaded ciphertext for item ${(r.id ?? "").slice(0, 8) || "-"}`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setCryptoStage("decrypting");
      addLog("Decrypting payload using in-memory key");

      const plain = await decryptItem(r);
      setDecrypted(plain);
      setSelectedMeta({
        site: (r.meta as any)?.site,
        login: (r.meta as any)?.login,
      });
      setVisualDecrypted(plain);
      setCryptoStage("decrypted");
      addLog("Decryption completed in browser memory");
    } catch (e: any) {
      setErr(e.message ?? String(e));
      setCryptoStage("error");
      addLog(`Decrypt failed: ${e.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id?: string) {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${VAULT_API_BASE}/vault/items/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`);
      if (decrypted) {
        setDecrypted(null);
        setSelectedMeta(null);
      }
      addLog(`Deleted item ${id.slice(0, 8)}`);
      await refresh();
    } catch (e: any) {
      setErr(e.message ?? String(e));
      setCryptoStage("error");
      addLog(`Delete failed: ${e.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (isReady) void refresh();
  }, [isReady]);

  if (!isReady) return <div className="muted">Login to derive your vault key...</div>;

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
        <button className="btn btn-primary" onClick={save} disabled={busy || !password.trim()}>
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

      <div className="crypto-visualizer">
        <div className="crypto-head">
          <span className="crypto-title">Crypto Visualizer</span>
          <div className="crypto-head-right">
            <button className="btn crypto-payload-btn" onClick={() => setShowPayloadModal(true)} disabled={!payloadSnapshot}>
              View Payload JSON
            </button>
            <span className={`crypto-status crypto-status-${cryptoStage}`}>
              {(cryptoStage === "encrypting" ||
                cryptoStage === "decrypting" ||
                cryptoStage === "storing" ||
                cryptoStage === "retrieving") && <span className="crypto-pulse" />}
              {stageLabel(cryptoStage)}
            </span>
          </div>
        </div>

        <div className="crypto-timeline" aria-label="encryption timeline">
          {TIMELINE_STEPS.map((step, idx) => (
            <div
              key={step}
              className={`crypto-step ${idx <= activeStep ? "crypto-step-active" : ""} ${idx === activeStep ? "crypto-step-current" : ""}`}
            >
              <div className="crypto-step-dot">{idx + 1}</div>
              <div className="crypto-step-label">{step}</div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div className={`crypto-step-line ${idx < activeStep ? "crypto-step-line-active" : ""}`} />
              )}
            </div>
          ))}
        </div>

        <div className="crypto-grid-view">
          <div className="crypto-block">
            <div className="crypto-label">Plaintext Input</div>
            <pre className="crypto-value">{visualPlaintext ?? "-"}</pre>
          </div>
          <div className="crypto-block">
            <div className="crypto-label">Ciphertext (ct)</div>
            <pre className="crypto-value">{visualCipher?.ct ?? "-"}</pre>
          </div>
          <div className="crypto-block">
            <div className="crypto-label">Nonce (iv)</div>
            <pre className="crypto-value">{visualCipher?.iv ?? "-"}</pre>
          </div>
          <div className="crypto-block">
            <div className="crypto-label">Auth Tag (tag)</div>
            <pre className="crypto-value">{visualCipher?.tag ?? "-"}</pre>
          </div>
          <div className="crypto-block crypto-block-wide">
            <div className="crypto-label">Decrypted Output</div>
            <pre className="crypto-value">{visualDecrypted ?? "-"}</pre>
          </div>
        </div>

        <div className="crypto-stats-grid">
          <div className="crypto-stat-card">
            <div className="crypto-stat-label">Plaintext bytes</div>
            <div className="crypto-stat-value">{stats.plaintextBytes || "-"}</div>
          </div>
          <div className="crypto-stat-card">
            <div className="crypto-stat-label">Ciphertext bytes</div>
            <div className="crypto-stat-value">{stats.ctBytes || "-"}</div>
          </div>
          <div className="crypto-stat-card">
            <div className="crypto-stat-label">IV bytes</div>
            <div className="crypto-stat-value">{stats.ivBytes || "-"}</div>
          </div>
          <div className="crypto-stat-card">
            <div className="crypto-stat-label">Tag bytes</div>
            <div className="crypto-stat-value">{stats.tagBytes || "-"}</div>
          </div>
          <div className="crypto-stat-card">
            <div className="crypto-stat-label">Plaintext entropy</div>
            <div className="crypto-stat-value">{stats.plaintextEntropy ? stats.plaintextEntropy.toFixed(2) : "-"}</div>
          </div>
          <div className="crypto-stat-card">
            <div className="crypto-stat-label">Ciphertext entropy</div>
            <div className="crypto-stat-value">{stats.ciphertextEntropy ? stats.ciphertextEntropy.toFixed(2) : "-"}</div>
          </div>
          <div className="crypto-stat-card crypto-stat-card-wide">
            <div className="crypto-stat-label">IV reuse check (session)</div>
            <div className="crypto-stat-value">
              {ivReused === null ? "-" : ivReused ? "REUSED (bad)" : "UNIQUE (good)"}
            </div>
          </div>
        </div>

        <div className="crypto-log-box">
          <div className="crypto-label">Event Log</div>
          {cryptoLog.length === 0 ? (
            <div className="muted small">No crypto actions yet.</div>
          ) : (
            <div className="crypto-log-lines">
              {cryptoLog.map((line, i) => (
                <div key={`${line}-${i}`} className="crypto-log-line">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
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
                    <button className="btn btn-primary" onClick={() => void handleDecrypt(r)} disabled={busy}>
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
            {selectedMeta?.site ?? "Item"} - {selectedMeta?.login ?? "login not set"}
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

      {showPayloadModal && (
        <div className="crypto-modal-backdrop" onClick={() => setShowPayloadModal(false)}>
          <div className="crypto-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crypto-modal-header">
              <h3>Cipher Payload Inspector</h3>
              <button className="btn" onClick={() => setShowPayloadModal(false)}>
                Close
              </button>
            </div>
            <pre className="crypto-modal-body">{payloadSnapshot || "No payload captured yet."}</pre>
            <div className="crypto-modal-actions">
              <button
                className="btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(payloadSnapshot);
                    addLog("Copied payload JSON to clipboard");
                  } catch {
                    addLog("Payload copy failed");
                  }
                }}
                disabled={!payloadSnapshot}
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
