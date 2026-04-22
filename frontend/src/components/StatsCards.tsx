import { useEffect, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";
import {
  belongsToCurrentUser,
  calcSecurityScore,
  isWeakPassword,
} from "../utils/security";

type Stats = {
  total: number;
  weak: number;
  securityScore: number;
};

type StatsCardsProps = {
  currentUser: string;
  refreshTrigger?: number;
};


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
        let decryptedCount = 0;

        for (const item of userItems) {
          try {
            const plaintext = await decryptItem(item);
            decryptedCount++;
            if (isWeakPassword(plaintext)) weak++;
          } catch {
            // skip items that fail to decrypt
          }
        }

        const total = decryptedCount;
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
