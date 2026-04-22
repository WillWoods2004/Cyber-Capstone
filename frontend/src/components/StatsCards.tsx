import { useEffect, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";

type Stats = {
  total: number;
  weak: number;
  securityScore: number;
};

type StatsCardsProps = {
  currentUser: string;
  refreshTrigger?: number;
};

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

function isWeakPassword(password: string): boolean {
  if (password.length < 8) return true;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const strengthCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  return strengthCount < 3;
}

function calcSecurityScore(total: number, weak: number): number {
  if (total === 0) return 100;
  const strongRatio = (total - weak) / total;
  return Math.round(strongRatio * 100);
}

export default function StatsCards({ currentUser, refreshTrigger }: StatsCardsProps) {
  const { listItems, decryptItem, isReady } = useCrypto();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;

    async function computeStats() {
      setLoading(true);
      try {
        const items: CipherBlob[] = await listItems();

        const userItems = items.filter((item) => belongsToCurrentUser(item, currentUser));

        let weak = 0;

        for (const item of userItems) {
          try {
            const plaintext = await decryptItem(item);
            if (isWeakPassword(plaintext)) weak++;
          } catch {
            // skip items that fail to decrypt
          }
        }

        const total = userItems.length;
        setStats({
          total,
          weak,
          securityScore: calcSecurityScore(total, weak),
        });
      } catch (err) {
        console.error("StatsCards: failed to load vault stats", err);
      } finally {
        setLoading(false);
      }
    }

    computeStats();
  }, [isReady, listItems, decryptItem, currentUser, refreshTrigger]);

  const cards = [
    {
      label: "Total Passwords",
      value: loading ? "—" : String(stats?.total ?? 0),
      icon: "🔒",
      color: "stat-blue",
    },
    {
      label: "Weak Passwords",
      value: loading ? "—" : String(stats?.weak ?? 0),
      icon: "⚠️",
      color: "stat-orange",
    },
    {
      label: "Security Score",
      value: loading ? "—" : `${stats?.securityScore ?? 0}%`,
      icon: "🛡️",
      color: "stat-green",
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((stat, idx) => (
        <div key={idx} className={`stat-card ${stat.color}`}>
          <div className="stat-header">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">{stat.icon}</span>
            </div>
            <span className="stat-trend">📈</span>
          </div>
          <p className="stat-label">{stat.label}</p>
          <p className="stat-value">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
