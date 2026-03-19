import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";
import { VAULT_API_BASE } from "../config/api";
import { getAuthToken } from "../auth/session";

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
  | "rotating"
  | "rotated"
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
    case "rotating":
      return "Rotating vault key";
    case "rotated":
      return "Vault key rotated";
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
    case "rotating":
    case "rotated":
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
  if (!b64) {
    return 0;
  }

  try {
    return atob(b64).length;
  } catch {
    return 0;
  }
}

function shannonEntropy(text?: string | null): number {
  if (!text || text.length === 0) {
    return 0;
  }

  const freq: Record<string, number> = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] ?? 0) + 1;
  }

  const len = text.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

export default function VaultPanel() {
  const {
    isReady,
    supportsKeyRotation,
    vaultProfile,
    vaultMode,
    encryptOnly,
    storeCipherBlob,
    listItems,
    getItem,
    decryptItem,
    rotateVaultKey,
  } = useCrypto();

  const [site, setSite] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rotationMessage, setRotationMessage] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<{ site?: string; login?: string } | null>(null);
  const [showRotationPanel, setShowRotationPanel] = useState(false);
  const [currentMasterPassword, setCurrentMasterPassword] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmNewMasterPassword, setConfirmNewMasterPassword] = useState("");

  const [cryptoStage, setCryptoStage] = useState<CryptoStage>("idle");
  const [visualPlaintext, setVisualPlaintext] = useState<string | null>(null);
  const [visualCipher, setVisualCipher] = useState<CipherBlob | null>(null);
  const [visualDecrypted, setVisualDecrypted] = useState<string | null>(null);
  const [cryptoLog, setCryptoLog] = useState<string[]>([]);
  const [payloadSnapshot, setPayloadSnapshot] = useState("");
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

  const addLog = useCallback((message: string) => {
    const stamp = new Date().toLocaleTimeString();
    setCryptoLog((prev) => [`${stamp} - ${message}`, ...prev].slice(0, 12));
  }, []);

  function clearRotationForm() {
    setCurrentMasterPassword("");
    setNewMasterPassword("");
    setConfirmNewMasterPassword("");
  }

  const refresh = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setRotationMessage(null);
    setDecrypted(null);
    setSelectedMeta(null);

    try {
      const items = await listItems();
      setRows(items.map((item, index) => ({ ...item, _idx: index })));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
      setCryptoStage("error");
      addLog(`Refresh failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }, [addLog, listItems]);

  async function save() {
    if (!password.trim()) {
      return;
    }

    setBusy(true);
    setErr(null);
    setRotationMessage(null);
    setVisualDecrypted(null);
    setVisualPlaintext(password);
    setCryptoStage("encrypting");
    setIvReused(null);
    addLog("Encrypting plaintext in browser");

    try {
      const savedAt = new Date().toISOString();
      const meta: Record<string, unknown> = {
        createdAt: savedAt,
        savedAt,
      };

      if (site.trim()) {
        meta.site = site.trim();
      }

      if (login.trim()) {
        meta.login = login.trim();
        meta.username = login.trim();
      }

      const blob = await encryptOnly(password, meta);
      const reused = seenIvRef.current.has(blob.iv);
      setIvReused(reused);
      if (!reused) {
        seenIvRef.current.add(blob.iv);
      }

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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
      setCryptoStage("error");
      addLog(`Save failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDecrypt(row: Row) {
    if (!row.id) {
      return;
    }

    setBusy(true);
    setErr(null);
    setRotationMessage(null);
    setCryptoStage("retrieving");
    setVisualPlaintext(null);
    addLog(`Loading ciphertext for item ${row.id.slice(0, 8)}`);

    try {
      let freshItem: CipherBlob = row;
      try {
        freshItem = await getItem(row.id);
      } catch {
        addLog("Single-item fetch unavailable, decrypting cached row");
      }
      setVisualCipher(freshItem);
      setPayloadSnapshot(
        JSON.stringify(
          {
            action: "DECRYPT_IN_BROWSER",
            sourceItemId: freshItem.id ?? null,
            payload: {
              ct: freshItem.ct,
              iv: freshItem.iv,
              tag: freshItem.tag,
              meta: freshItem.meta ?? {},
            },
          },
          null,
          2
        )
      );

      setCryptoStage("decrypting");
      addLog("Decrypting payload using in-memory vault key");

      const plain = await decryptItem(freshItem);
      setDecrypted(plain);
      setSelectedMeta({
        site: (freshItem.meta as { site?: string } | undefined)?.site,
        login: (freshItem.meta as { login?: string } | undefined)?.login,
      });
      setVisualDecrypted(plain);
      setCryptoStage("decrypted");
      addLog("Decryption completed in browser memory");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
      setCryptoStage("error");
      addLog(`Decrypt failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id?: string) {
    if (!id) {
      return;
    }

    setBusy(true);
    setErr(null);
    setRotationMessage(null);

    try {
      const token = getAuthToken();
      const res = await fetch(`${VAULT_API_BASE}/vault/items/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok && res.status !== 204) {
        throw new Error(`Delete failed: ${res.status}`);
      }

      if (decrypted) {
        setDecrypted(null);
        setSelectedMeta(null);
      }

      addLog(`Deleted item ${id.slice(0, 8)}`);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
      setCryptoStage("error");
      addLog(`Delete failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRotateKey() {
    setErr(null);
    setRotationMessage(null);

    if (!currentMasterPassword.trim()) {
      setErr("Current master password is required for rotation.");
      return;
    }

    if (newMasterPassword.trim().length < 8) {
      setErr("New master password must be at least 8 characters.");
      return;
    }

    if (newMasterPassword !== confirmNewMasterPassword) {
      setErr("New password confirmation does not match.");
      return;
    }

    setBusy(true);
    setCryptoStage("rotating");
    addLog("Starting client-side vault key rotation");

    try {
      const nextProfile = await rotateVaultKey({
        currentPassword: currentMasterPassword,
        newPassword: newMasterPassword,
      });

      clearRotationForm();
      setShowRotationPanel(false);
      setRotationMessage(
        `Vault key rotated successfully. Key version is now v${nextProfile.keyVersion}. Use your new master password the next time you sign in.`
      );
      setCryptoStage("rotated");
      addLog(`Vault key rotated to version ${nextProfile.keyVersion}`);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErr(message);
      setCryptoStage("error");
      addLog(`Key rotation failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (isReady) {
      void refresh();
    }
  }, [isReady, refresh]);

  if (!isReady) {
    return <div className="muted">Login to derive your vault key...</div>;
  }

  return (
    <div className="vault">
      <div className="vault-header">
        <div>
          <div className="vault-profile-label">Vault policy</div>
          <div className="vault-profile-value">
            AES-256-GCM, Argon2id, zero-knowledge sync, auto-lock enabled
          </div>
          {vaultMode === "legacy" && (
            <div className="vault-profile-meta">Live API compatibility mode</div>
          )}
          {vaultProfile && (
            <div className="vault-profile-meta">
              Key version v{vaultProfile.keyVersion}
            </div>
          )}
        </div>

        {supportsKeyRotation ? (
          <button className="btn" onClick={() => setShowRotationPanel((prev) => !prev)} disabled={busy}>
            {showRotationPanel ? "Hide rotation" : "Rotate vault key"}
          </button>
        ) : (
          <div className="vault-profile-meta">Rotation requires the newer backend contract.</div>
        )}
      </div>

      {supportsKeyRotation && showRotationPanel && (
        <div className="vault-rotation-panel">
          <div className="vault-rotation-copy">
            Re-encrypt every stored item client-side with a new Argon2id-derived key. The server only receives new ciphertext.
          </div>
          <div className="vault-rotation-grid">
            <input
              className="vault-input"
              type="password"
              placeholder="Current master password"
              value={currentMasterPassword}
              onChange={(event) => setCurrentMasterPassword(event.target.value)}
            />
            <input
              className="vault-input"
              type="password"
              placeholder="New master password"
              value={newMasterPassword}
              onChange={(event) => setNewMasterPassword(event.target.value)}
            />
            <input
              className="vault-input"
              type="password"
              placeholder="Confirm new master password"
              value={confirmNewMasterPassword}
              onChange={(event) => setConfirmNewMasterPassword(event.target.value)}
            />
            <button className="btn btn-primary" onClick={() => void handleRotateKey()} disabled={busy}>
              Apply rotation
            </button>
          </div>
        </div>
      )}

      <div className="vault-toolbar">
        <input
          className="vault-input vault-input-wide"
          placeholder="Website (e.g., gmail.com)"
          value={site}
          onChange={(event) => setSite(event.target.value)}
        />
        <input
          className="vault-input"
          placeholder="Login / email (e.g., user@gmail.com)"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
        />
        <input
          className="vault-input"
          type="password"
          placeholder="Password to encrypt"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button className="btn btn-primary" onClick={() => void save()} disabled={busy || !password.trim()}>
          Save
        </button>
        <button className="btn" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </button>
      </div>

      {err && <div className="error">{err}</div>}
      {rotationMessage && <div className="vault-success">{rotationMessage}</div>}
      <div className="muted small" style={{ marginBottom: 8 }}>
        Password is required. Site/login are optional but recommended so you can recognize the entry. Plaintext stays in browser memory and only ciphertext is synced.
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
                cryptoStage === "retrieving" ||
                cryptoStage === "rotating") && <span className="crypto-pulse" />}
              {stageLabel(cryptoStage)}
            </span>
          </div>
        </div>

        <div className="crypto-timeline" aria-label="encryption timeline">
          {TIMELINE_STEPS.map((step, index) => (
            <div
              key={step}
              className={`crypto-step ${index <= activeStep ? "crypto-step-active" : ""} ${
                index === activeStep ? "crypto-step-current" : ""
              }`}
            >
              <div className="crypto-step-dot">{index + 1}</div>
              <div className="crypto-step-label">{step}</div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div className={`crypto-step-line ${index < activeStep ? "crypto-step-line-active" : ""}`} />
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
            <div className="crypto-stat-value">
              {stats.plaintextEntropy ? stats.plaintextEntropy.toFixed(2) : "-"}
            </div>
          </div>
          <div className="crypto-stat-card">
            <div className="crypto-stat-label">Ciphertext entropy</div>
            <div className="crypto-stat-value">
              {stats.ciphertextEntropy ? stats.ciphertextEntropy.toFixed(2) : "-"}
            </div>
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
              {cryptoLog.map((line, index) => (
                <div key={`${line}-${index}`} className="crypto-log-line">
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
              <th>Key version</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No items yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id ?? row._idx}>
                  <td className="vault-id" title={row.id ?? ""}>
                    {(row.id ?? "").slice(0, 8) || "-"}
                  </td>
                  <td className="vault-meta">{(row.meta as { site?: string } | undefined)?.site ?? "-"}</td>
                  <td className="vault-meta">{(row.meta as { login?: string } | undefined)?.login ?? "-"}</td>
                  <td className="vault-meta">
                    v{String((row.meta as { keyVersion?: number } | undefined)?.keyVersion ?? "-")}
                  </td>
                  <td className="vault-actions">
                    <button className="btn btn-primary" onClick={() => void handleDecrypt(row)} disabled={busy}>
                      Decrypt
                    </button>
                    {row.id && (
                      <button className="btn btn-danger" onClick={() => void remove(row.id)} disabled={busy}>
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
            <span className="muted">Decrypted password:</span> <code className="mono">{decrypted}</code>
            <button
              className="btn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(decrypted);
                } catch {
                  // ignore clipboard failures
                }
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {showPayloadModal && (
        <div className="crypto-modal-backdrop" onClick={() => setShowPayloadModal(false)}>
          <div className="crypto-modal" onClick={(event) => event.stopPropagation()}>
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
