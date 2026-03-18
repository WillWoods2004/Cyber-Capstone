import { useEffect, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";

type SecurityIssue = {
  type: string;
  count: number;
  severity: "high" | "medium" | "low";
};

type SecurityOverviewProps = {
  expanded?: boolean;
};

function isWeak(password: string): boolean {
  if (password.length < 8) return true;
  const hasUpper   = /[A-Z]/.test(password);
  const hasLower   = /[a-z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length < 3;
}

function isOld(meta?: Record<string, unknown>): boolean {
  if (!meta?.savedAt) return false;
  const saved = new Date(meta.savedAt as string).getTime();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - saved > ninetyDays;
}

export default function SecurityOverview({ expanded: _expanded = false }: SecurityOverviewProps) {
  const { listItems, decryptItem, isReady } = useCrypto();
  const [issues, setIssues]   = useState<SecurityIssue[]>([]);
  const [score, setScore]     = useState<number>(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;

    async function analyze() {
      setLoading(true);
      try {
        const items: CipherBlob[] = await listItems();
        const plaintexts: string[] = [];

        let weakCount = 0;
        let oldCount  = 0;

        for (const item of items) {
          try {
            const plaintext = await decryptItem(item);
            plaintexts.push(plaintext);
            if (isWeak(plaintext)) weakCount++;
            if (isOld(item.meta))  oldCount++;
          } catch {
            // skip
          }
        }

        const duplicateCount = plaintexts.length - new Set(plaintexts).size;

        const found: SecurityIssue[] = [];
        if (weakCount > 0)      found.push({ type: "Weak Password",           count: weakCount,      severity: "high" });
        if (duplicateCount > 0) found.push({ type: "Duplicate Password",      count: duplicateCount, severity: "medium" });
        if (oldCount > 0)       found.push({ type: "Old Password (>90 days)", count: oldCount,       severity: "low" });

        setIssues(found);

        const total = items.length || 1;
        const deduction = (weakCount * 3 + duplicateCount * 2 + oldCount * 1) / total * 100;
        setScore(Math.max(0, Math.round(100 - deduction)));
      } catch (err) {
        console.error("SecurityOverview: failed to analyze", err);
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [isReady, listItems, decryptItem]);

  const scoreColor = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">🛡️</span>
        <h3 className="panel-title">Security Overview</h3>
      </div>
      <div className="panel-content">
        <div className="security-score-section">
          <div className="security-score-header">
            <span className="security-score-label">Overall Security Score</span>
            <span className="security-score-value" style={{ color: scoreColor }}>
              {loading ? "—" : `${score}%`}
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
          {!loading && issues.length === 0 && (
            <p style={{ color: "#22c55e", fontSize: "0.85rem", padding: "0.5rem 0" }}>
              ✓ No security issues found.
            </p>
          )}
          {issues.map((issue, idx) => (
            <div key={idx} className="security-issue">
              <div className="security-issue-left">
                <span className={`security-severity severity-${issue.severity}`}>⚠️</span>
                <div>
                  <p className="security-issue-type">{issue.type}</p>
                  <p className="security-issue-count">{issue.count} passwords affected</p>
                </div>
              </div>
              <button className="security-fix-btn">Fix Now</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
