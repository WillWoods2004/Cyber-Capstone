import { useEffect, useState } from "react";
import { useCrypto } from "../crypto/CryptoProvider";
import type { CipherBlob } from "../crypto/crypto";

type ActivityItem = {
  action: string;
  detail: string;
  time: string;
  icon: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return "Unknown";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export default function ActivityFeed() {
  const { listItems, isReady } = useCrypto();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!isReady) return;

    async function load() {
      setLoading(true);
      try {
        const items: CipherBlob[] = await listItems();

        const events: ActivityItem[] = items
          .filter((item) => item.meta?.savedAt)
          .sort((a, b) => {
            const aTime = new Date(a.meta!.savedAt as string).getTime();
            const bTime = new Date(b.meta!.savedAt as string).getTime();
            return bTime - aTime;
          })
          .slice(0, 5)
          .map((item) => ({
            action: "Password added",
            detail: (item.meta?.site as string) || "Unknown site",
            time:   timeAgo(item.meta?.savedAt as string),
            icon:   "➕",
          }));

        if (events.length === 0 && items.length > 0) {
          events.push({
            action: "Vault loaded",
            detail: `${items.length} passwords in your vault`,
            time:   "Just now",
            icon:   "🔒",
          });
        }

        setActivities(events);
      } catch (err) {
        console.error("ActivityFeed: failed to load", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isReady, listItems]);

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-icon">📊</span>
        <h3 className="panel-title">Recent Activity</h3>
      </div>
      <div className="panel-content">
        <div className="activity-list">
          {loading && (
            <p style={{ color: "#6b7280", fontSize: "0.85rem", padding: "0.5rem 0" }}>
              Loading activity...
            </p>
          )}
          {!loading && activities.length === 0 && (
            <p style={{ color: "#6b7280", fontSize: "0.85rem", padding: "0.5rem 0" }}>
              No activity yet.
            </p>
          )}
          {activities.map((activity, idx) => (
            <div key={idx} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <p className="activity-action">{activity.action}</p>
                <p className="activity-detail">{activity.detail}</p>
                <p className="activity-time">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
