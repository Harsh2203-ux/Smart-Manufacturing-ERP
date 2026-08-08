import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { KpiCard, SectionCard, StatusPill } from "../components/ui";
import { notificationsApi, type NotificationRecord } from "../api/businessApi";

// ── Severity helpers ──────────────────────────────────────────────────────────

const TYPE_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  alert: "error", warning: "warning", info: "info", success: "success",
  production: "info", maintenance: "warning", quality: "error", inventory: "neutral",
  purchase: "info", hr: "neutral", sales: "success", system: "neutral", finance: "warning",
};

const SEVERITY_DOT: Record<string, string> = {
  alert: "var(--error-text)", error: "var(--error-text)",
  warning: "var(--warning-text)",
  info: "var(--accent)",
  success: "var(--success-text)",
};

function dotColor(type: string): string {
  return SEVERITY_DOT[type.toLowerCase()] ?? "var(--accent)";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState<"all" | "unread">("all");
  const [marking, setMarking]             = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await notificationsApi.list({ limit: "50" });
    if (r.data) setNotifications(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const displayed = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  const unread   = notifications.filter((n) => !n.isRead).length;

  async function handleMarkAllRead() {
    setMarking(true);
    await notificationsApi.markAllRead();
    setMarking(false);
    void load();
  }

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
  }

  async function handleDelete(id: string) {
    await notificationsApi.delete(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }

  const filters: Array<"all" | "unread"> = ["all", "unread"];

  return (
    <PageShell
      title="Notifications"
      subtitle="System alerts, production warnings, and operational notifications."
      action={
        <button
          onClick={handleMarkAllRead}
          disabled={marking || unread === 0}
          style={{ padding: "9px 18px", fontSize: "13px", fontWeight: 600, borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: unread > 0 ? "pointer" : "not-allowed", opacity: unread > 0 ? 1 : 0.5 }}
        >
          {marking ? "Marking…" : "Mark All Read"}
        </button>
      }
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Unread"  value={String(unread)}                sub="Need attention"  accent />
        <KpiCard label="Total"   value={String(notifications.length)}  sub="All notifications"      />
        <KpiCard label="Read"    value={String(notifications.length - unread)} sub="Acknowledged"   />
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: "6px",
              border: `1px solid ${filter === f ? "var(--accent)" : "var(--card-border)"}`,
              background: filter === f ? "var(--accent)" : "var(--card-bg)",
              color: filter === f ? "#fff" : "var(--text)",
              fontSize: "13px", cursor: "pointer", fontWeight: filter === f ? 600 : 400,
              textTransform: "capitalize",
            }}
          >
            {f}
            {f === "unread" && unread > 0 && (
              <span style={{ marginLeft: "6px", background: "rgba(255,255,255,0.3)", borderRadius: "999px", padding: "0 6px", fontSize: "11px" }}>
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <SectionCard title={`Notifications (${displayed.length})`}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {loading && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
          )}
          {!loading && displayed.length === 0 && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text)" }}>
              No notifications {filter === "unread" ? "— you're all caught up!" : "found."}
            </div>
          )}
          {displayed.map((n, idx) => (
            <div
              key={n._id}
              style={{
                display: "flex", alignItems: "flex-start", gap: "16px",
                padding: "16px 24px",
                borderBottom: idx < displayed.length - 1 ? "1px solid var(--card-border)" : "none",
                background: n.isRead ? "transparent" : "color-mix(in srgb, var(--accent) 4%, transparent)",
                transition: "background 0.2s",
              }}
            >
              {/* Severity dot */}
              <div style={{ paddingTop: "4px", flexShrink: 0 }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dotColor(n.type) }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span style={{ fontSize: "14px", fontWeight: n.isRead ? 500 : 700, color: "var(--text-h)" }}>{n.title}</span>
                  {!n.isRead && (
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent)", background: "var(--brand-100)", padding: "2px 8px", borderRadius: "999px" }}>NEW</span>
                  )}
                  <StatusPill label={n.type} variant={TYPE_VARIANT[n.type.toLowerCase()] ?? "neutral"} />
                  {n.priority && (
                    <span style={{ fontSize: "11px", fontWeight: 600, color: n.priority === "high" ? "var(--error-text)" : "var(--text)", background: "var(--table-head-bg)", padding: "2px 8px", borderRadius: "999px" }}>
                      {n.priority.toUpperCase()}
                    </span>
                  )}
                </div>
                <p style={{ margin: "0 0 8px", fontSize: "13px", color: "var(--text)", lineHeight: "1.5" }}>{n.message}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "var(--text)" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                  {n.link && (
                    <a href={n.link} style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
                      View →
                    </a>
                  )}
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      style={{ fontSize: "12px", color: "var(--text)", background: "none", border: "none", cursor: "pointer", padding: "0", fontWeight: 500 }}
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n._id)}
                    style={{ fontSize: "12px", color: "var(--error-text)", background: "none", border: "none", cursor: "pointer", padding: "0", fontWeight: 500 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageShell>
  );
}
