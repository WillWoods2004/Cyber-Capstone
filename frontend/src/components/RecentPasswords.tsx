import { useEffect, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";

type PasswordEntry = {
  site: string;
  username: string;
  lastUsed: string;
  strength: "strong" | "medium" | "weak";
  plaintext: string;
};

function getStrength(password: string): "strong" | "medium" | "weak" {
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const long       = password.length >= 12;
  const score      = [hasUpper, hasLower, hasNumber, hasSpecial, long].filter(Boolean).length;
  if (score >= 4) return "strong";
  if (score >= 2) return "medium";
  return "weak";
}

function timeAgo(iso?: string): string {
  if (!iso) return "Unknown";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function RecentPasswords() {
  const { listItems, decryptItem, isReady } = useCrypto();
  const [passwords, setPasswords]           = useState<PasswordEntry[]>([]);
  const [showPassword, setShowPassword]     = useState<{ [key: number]: boolean }>({});
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    if (!isReady) return;

    async function load() {
      setLoading(true);
      try {
        const items: CipherBlob[] = await listItems();

        const sorted = [...items].sort((a, b) => {
          const aTime = a.meta?.savedAt ? new Date(a.meta.savedAt as string).getTime() : 0;
          const bTime = b.meta?.savedAt ? new Date(b.meta.savedAt as string).getTime() : 0;
          return bTime - aTime;
        });

        const recent = sorted.slice(0, 4);

        const entries: PasswordEntry[] = [];
        for (const item of recent) {
          try {
            const plaintext = await decryptItem(item);
            entries.push({
              site:      (item.meta?.site as string)     || "Unknown Site",
              username:  (item.meta?.username as string) || "—",
              lastUsed:  timeAgo(item.meta?.savedAt as string),
              strength:  getStrength(plaintext),
              plaintext,
            });
          } catch {
            // skip items that fail to decrypt
          }
        }

        setPasswords(entries);
      } catch (err) {
        console.error("RecentPasswords: failed to load", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isReady, listItems, decryptItem]);

  const togglePassword = (idx: number) => {
    setShowPassword((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Recent Passwords</h3>
        <button className="panel-link">View All →</button>
      </div>
      <div className="panel-content">
        <div className="password-list">
          {loading && (
            <p style={{ color: "#6b7280", fontSize: "0.85rem", padding: "0.5rem 0" }}>
              Loading passwords...
            </p>
          )}
          {!loading && passwords.length === 0 && (
            <p style={{ color: "#6b7280", fontSize: "0.85rem", padding: "0.5rem 0" }}>
              No passwords saved yet.
            </p>
          )}
          {passwords.map((pwd, idx) => (
            <div key={idx} className="password-item">
              <div className="password-item-left">
                <div className="password-avatar">🔒</div>
                <div>
                  <p className="password-site">{pwd.site}</p>
                  <p className="password-username">
                    {showPassword[idx] ? pwd.plaintext : pwd.username}
                  </p>
                </div>
              </div>
              <div className="password-item-right">
                <span className={`password-badge badge-${pwd.strength}`}>{pwd.strength}</span>
                <span className="password-time">{pwd.lastUsed}</span>
                <button className="password-toggle" onClick={() => togglePassword(idx)}>
                  {showPassword[idx] ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
