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

type RecentPasswordsProps = {
  currentUser: string;
};

function getStrength(password: string): "strong" | "medium" | "weak" {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const long = password.length >= 12;
  const score = [hasUpper, hasLower, hasNumber, hasSpecial, long].filter(Boolean).length;

  if (score >= 4) return "strong";
  if (score >= 2) return "medium";
  return "weak";
}

function timeAgo(iso?: string): string {
  if (!iso) return "Unknown";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function getSavedTimestamp(item: CipherBlob): string | undefined {
  return (item.meta?.savedAt as string | undefined) || (item.meta?.createdAt as string | undefined);
}

function belongsToCurrentUser(item: CipherBlob, currentUser: string): boolean {
  const metaUserId = (item.meta?.userId as string | undefined) ?? "";
  const metaUsername = (item.meta?.username as string | undefined) ?? "";
  const metaLogin = (item.meta?.login as string | undefined) ?? "";

  if (!currentUser.trim()) {
    return true;
  }

  if (!metaUserId && !metaUsername && !metaLogin) {
    return true;
  }

  return (
    metaUserId === currentUser ||
    metaUsername === currentUser ||
    metaLogin === currentUser
  );
}

export default function RecentPasswords({ currentUser }: RecentPasswordsProps) {
  const { listItems, decryptItem, isReady } = useCrypto();
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) {
      setPasswords([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const items: CipherBlob[] = await listItems();

        const userItems = items.filter((item) => belongsToCurrentUser(item, currentUser));

        const sorted = [...userItems].sort((a, b) => {
          const aTime = getSavedTimestamp(a) ? new Date(getSavedTimestamp(a) as string).getTime() : 0;
          const bTime = getSavedTimestamp(b) ? new Date(getSavedTimestamp(b) as string).getTime() : 0;
          return bTime - aTime;
        });

        const recent = sorted.slice(0, 4);
        const entries: PasswordEntry[] = [];

        for (const item of recent) {
          try {
            const plaintext = await decryptItem(item);
            entries.push({
              site: (item.meta?.site as string) || "Unknown Site",
              username:
                (item.meta?.username as string) ||
                (item.meta?.login as string) ||
                "-",
              lastUsed: timeAgo(getSavedTimestamp(item)),
              strength: getStrength(plaintext),
              plaintext,
            });
          } catch {
            // Skip items that fail to decrypt
          }
        }

        setPasswords(entries);
      } catch (err) {
        console.error("RecentPasswords: failed to load", err);
        setPasswords([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [decryptItem, isReady, listItems, currentUser]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3 className="panel-title">Recent Passwords</h3>
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
                <div className="password-avatar">Lock</div>
                <div>
                  <p className="password-site">{pwd.site}</p>

                  {/* FIX: Always mask password */}
                  <p className="password-username">••••••••••</p>

                </div>
              </div>
              <div className="password-item-right">
                <span className={`password-badge badge-${pwd.strength}`}>
                  {pwd.strength}
                </span>
                <span className="password-time">{pwd.lastUsed}</span>

                {/* FIX: Removed Show/Hide button */}

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
