import { useEffect, useMemo, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";

type SecurityOverviewProps = {
  expanded?: boolean;
};

type ScoredPassword = {
  id: string;
  label: string;
  password: string;
  score: number;
  rating: string;
};

function scorePassword(password: string) {
  let score = 0;

  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 20;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score >= 85) return { score, rating: "Strong" };
  if (score >= 60) return { score, rating: "Moderate" };
  return { score, rating: "Weak" };
}

export default function SecurityOverview({
  expanded = false,
}: SecurityOverviewProps) {
  const { isReady, listItems, decryptItem } = useCrypto();
  const [items, setItems] = useState<ScoredPassword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!isReady) {
        setItems([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const vaultItems: CipherBlob[] = await listItems();
        const scored: ScoredPassword[] = [];

        for (const item of vaultItems) {
          try {
            const plaintext = await decryptItem(item);
            const label =
              typeof item.meta?.label === "string"
                ? item.meta.label
                : "Saved Entry";

            const result = scorePassword(plaintext);

            scored.push({
              id: item.id ?? crypto.randomUUID(),
              label,
              password: plaintext,
              score: result.score,
              rating: result.rating,
            });
          } catch {
            // skip entries that cannot be decrypted with current key
          }
        }

        if (mounted) {
          setItems(scored);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message ?? "Failed to load security data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [isReady, listItems, decryptItem]);

  const overallScore = useMemo(() => {
    if (!items.length) return 0;
    const total = items.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / items.length);
  }, [items]);

  const overallRating =
    overallScore >= 85 ? "Strong" : overallScore >= 60 ? "Moderate" : "Weak";

  if (!expanded) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Security Overview</h3>
        </div>
        <div className="panel-content">
          <p className="dashboard-subtitle">
            Overall password health: <strong>{overallRating}</strong> ({overallScore}/100)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="security-page">
      <h2 className="dashboard-title">Security Center</h2>
      <p className="dashboard-subtitle">
        Review all saved passwords and their security ratings.
      </p>

      <div className="settings-card" style={{ marginBottom: "20px" }}>
        <h3 className="settings-section-title">Overall Security Score</h3>
        <p className="settings-section-subtitle">
          {items.length
            ? `${overallScore}/100 — ${overallRating}`
            : "No saved passwords available to score."}
        </p>
      </div>

      {loading && (
        <div className="settings-card">
          <p className="settings-section-subtitle">Loading security analysis...</p>
        </div>
      )}

      {error && (
        <div className="settings-card">
          <p className="settings-section-subtitle">{error}</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="settings-card">
          <p className="settings-section-subtitle">
            No decryptable passwords were found for this session.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="settings-layout">
          {items.map((item) => (
            <div className="settings-card" key={item.id}>
              <h3 className="settings-section-title">{item.label}</h3>
              <p className="settings-section-subtitle">
                Rating: <strong>{item.rating}</strong>
              </p>
              <p className="settings-section-subtitle">
                Score: <strong>{item.score}/100</strong>
              </p>
              <p className="settings-section-subtitle">
                Length: <strong>{item.password.length}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
