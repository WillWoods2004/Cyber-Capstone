import { useEffect, useMemo, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";
import {
  calcSecurityScore,
  filterVaultItems,
  isWeakPassword,
  scorePassword,
} from "../utils/security";

type SecurityOverviewProps = {
  expanded?: boolean;
  currentUser?: string;
  refreshTrigger?: number;
  onFixNow?: () => void;
};

type SecurityIssue = {
  type: string;
  count: number;
  severity: "high" | "medium" | "low";
};

type ScoredPassword = {
  id: string;
  label: string;
  password: string;
  score: number;
  rating: "Strong" | "Moderate" | "Weak";
};


function isOld(meta?: Record<string, unknown>): boolean {
  const savedAt =
    (meta?.savedAt as string | undefined) ||
    (meta?.createdAt as string | undefined);
  if (!savedAt) return false;

  const saved = new Date(savedAt).getTime();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - saved > ninetyDays;
}


function labelForItem(item: CipherBlob): string {
  const meta = item.meta as Record<string, unknown> | undefined;
  return (
    (typeof meta?.site === "string" && meta.site) ||
    (typeof meta?.label === "string" && meta.label) ||
    (typeof meta?.username === "string" && meta.username) ||
    (typeof meta?.login === "string" && meta.login) ||
    "Saved Entry"
  );
}

export default function SecurityOverview({
  expanded = false,
  currentUser = "",
  refreshTrigger = 0,
  onFixNow,
}: SecurityOverviewProps) {
  const { listItems, decryptItem, isReady, vaultMode } = useCrypto();
  const [issues, setIssues] = useState<SecurityIssue[]>([]);
  const [items, setItems] = useState<ScoredPassword[]>([]);
  const [score, setScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function analyze() {
      if (!isReady) {
        if (mounted) {
          setIssues([]);
          setItems([]);
          setScore(100);
          setError("");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const vaultItems: CipherBlob[] = await listItems();
        const userItems = filterVaultItems(vaultItems, currentUser, vaultMode);

        const plaintexts: string[] = [];
        const scored: ScoredPassword[] = [];

        let weakCount = 0;
        let oldCount = 0;

        for (const item of userItems) {
          try {
            const plaintext = await decryptItem(item);
            plaintexts.push(plaintext);

            if (isWeakPassword(plaintext)) weakCount++;
            if (isOld(item.meta)) oldCount++;

            const result = scorePassword(plaintext);
            scored.push({
              id: item.id ?? `${labelForItem(item)}-${scored.length}`,
              label: labelForItem(item),
              password: plaintext,
              score: result.score,
              rating: result.rating,
            });
          } catch {
            // Skip items that cannot be decrypted with the current session key.
          }
        }

        const duplicateCount = plaintexts.length - new Set(plaintexts).size;
        const found: SecurityIssue[] = [];

        if (weakCount > 0) {
          found.push({ type: "Weak Password", count: weakCount, severity: "high" });
        }
        if (duplicateCount > 0) {
          found.push({
            type: "Duplicate Password",
            count: duplicateCount,
            severity: "medium",
          });
        }
        if (oldCount > 0) {
          found.push({
            type: "Old Password (>90 days)",
            count: oldCount,
            severity: "low",
          });
        }

        if (mounted) {
          setIssues(found);
          setItems(scored);
          setScore(calcSecurityScore(scored.length, weakCount));
        }
      } catch (err) {
        console.error("SecurityOverview: failed to analyze", err);
        if (mounted) {
          setIssues([]);
          setItems([]);
          setScore(100);
          setError(
            err instanceof Error ? err.message : "Failed to load security analysis."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void analyze();

    return () => {
      mounted = false;
    };
  }, [decryptItem, isReady, listItems, currentUser, refreshTrigger]);

  const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const visibleIssues = expanded ? issues : issues.slice(0, 3);
  const overallRating = useMemo(() => {
    if (score >= 85) return "Strong";
    if (score >= 60) return "Moderate";
    return "Weak";
  }, [score]);

  if (!expanded) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Security Overview</h3>
        </div>
        <div className="panel-content">
          <div className="security-score-section">
            <div className="security-score-header">
              <span className="security-score-label">Overall Security Score</span>
              <span className="security-score-value" style={{ color: scoreColor }}>
                {loading ? "-" : `${score}%`}
              </span>
            </div>
            <div className="security-progress-bar">
              <div
                className="security-progress-fill"
                style={{ width: loading ? "0%" : `${score}%`, background: scoreColor }}
              />
            </div>
          </div>

          <div className="security-issues">
            {loading && (
              <p style={{ color: "#6b7280", fontSize: "0.85rem", padding: "0.5rem 0" }}>
                Analyzing vault...
              </p>
            )}
            {!loading && error && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", padding: "0.5rem 0" }}>
                {error}
              </p>
            )}
            {!loading && !error && visibleIssues.length === 0 && (
              <p style={{ color: "#22c55e", fontSize: "0.85rem", padding: "0.5rem 0" }}>
                No security issues found.
              </p>
            )}
            {!loading &&
              !error &&
              visibleIssues.map((issue) => (
                <div key={issue.type} className="security-issue">
                  <div className="security-issue-left">
                    <span className={`security-severity severity-${issue.severity}`}>
                      Alert
                    </span>
                    <div>
                      <p className="security-issue-type">{issue.type}</p>
                      <p className="security-issue-count">
                        {issue.count} passwords affected
                      </p>
                    </div>
                  </div>
                  <button className="security-fix-btn" onClick={onFixNow}>
                    Fix Now
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="security-page">
      <h2 className="dashboard-title">Security Center</h2>
      <p className="dashboard-subtitle">
        Review your decrypted vault entries, overall score, and password hygiene issues.
      </p>

      <div className="settings-card" style={{ marginBottom: "20px" }}>
        <h3 className="settings-section-title">Overall Security Score</h3>
        <p className="settings-section-subtitle">
          {loading ? "Loading security analysis..." : `${score}/100 - ${overallRating}`}
        </p>
      </div>

      {error && (
        <div className="settings-card" style={{ marginBottom: "20px" }}>
          <p className="settings-section-subtitle">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="settings-layout" style={{ marginBottom: "20px" }}>
          {visibleIssues.length === 0 ? (
            <div className="settings-card">
              <h3 className="settings-section-title">No Issues Detected</h3>
              <p className="settings-section-subtitle">
                Your current decrypted vault entries do not show weak, duplicate, or old
                passwords.
              </p>
            </div>
          ) : (
            visibleIssues.map((issue) => (
              <div className="settings-card" key={issue.type}>
                <h3 className="settings-section-title">{issue.type}</h3>
                <p className="settings-section-subtitle">
                  Severity: <strong>{issue.severity}</strong>
                </p>
                <p className="settings-section-subtitle">
                  Count: <strong>{issue.count}</strong>
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {loading && (
        <div className="settings-card">
          <p className="settings-section-subtitle">Loading decryptable vault entries...</p>
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
        <>
          <h3 className="settings-section-title" style={{ marginBottom: "16px" }}>
            Passwords
          </h3>

          <div className="settings-layout">
            {items.map((item) => (
              <div className="settings-card" key={item.id}>
                <h3 className="settings-section-title">Website: {item.label}</h3>
                <p className="settings-section-subtitle">
                  Rating: <strong>{item.rating}</strong>
                </p>
                <p className="settings-section-subtitle">
                  Score: <strong>{item.score}/100</strong>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
