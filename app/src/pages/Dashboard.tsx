/**
 * pages/Dashboard.tsx
 * World-class Smart Manufacturing ERP Dashboard
 * SAP / Oracle / Odoo inspired — modular, responsive, professional.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { reportsApi } from "../api/businessApi";

// ── UI primitives ─────────────────────────────────────────────────────────────
import { Card }                          from "../components/ui/Card";
import { Badge, toBadgeVariant }         from "../components/ui/Badge";
import { DataTable, type Column }        from "../components/ui/DataTable";
import { Sparkline }                     from "../components/ui/Sparkline";

// ── Charts ────────────────────────────────────────────────────────────────────
import { LineChart }     from "../components/charts/LineChart";
import { BarChart }      from "../components/charts/BarChart";
import { DonutChart }    from "../components/charts/DonutChart";
import { HorizontalBar } from "../components/charts/HorizontalBar";
import { GaugeBar }      from "../components/charts/GaugeBar";

// ── Data ──────────────────────────────────────────────────────────────────────
import {
  KPI_CARDS,
  PRODUCTION_TREND,
  WEEKLY_ORDERS,
  MACHINE_UTILIZATION,
  MONTHLY_REVENUE,
  INVENTORY_DIST,
  RECENT_MFG_ORDERS,
  RECENT_INV_TXNS,
  RECENT_PO,
  RECENT_SO,
  NOTIFICATIONS,
  QUICK_ACTIONS,
  MAINTENANCE_ITEMS,
  SCHEDULE_ITEMS,
  PENDING_APPROVALS,
  SYSTEM_HEALTH,
  MACHINE_STATUS,
  PRODUCTION_LINES,
} from "../data/dashboardData";

// ── Types ─────────────────────────────────────────────────────────────────────
import type {
  ManufacturingOrder,
  InventoryTransaction,
  PurchaseOrder,
  SalesOrder,
  MaintenanceItem,
  SystemHealthItem,
  MachineStatus,
} from "../types/dashboard";

// ─── SVG icon helper (inline, matches navItems.ts icons) ─────────────────────
import { renderIcon } from "../components/Sidebar/navItems";

function SvgIcon({ name, size = 14, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  return (
    <span
      style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: renderIcon(name) }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI Card
// ═══════════════════════════════════════════════════════════════════════════════
function KpiCardWidget({ card }: { card: typeof KPI_CARDS[0] }) {
  return (
    <div style={{
      background:    "var(--card-bg)",
      border:        "1px solid var(--card-border)",
      borderRadius:  "12px",
      padding:       "18px 18px 16px",
      display:       "flex",
      flexDirection: "column",
      gap:           "12px",
      boxShadow:     "var(--shadow-sm)",
      position:      "relative",
      overflow:      "hidden",
      cursor:        "default",
      transition:    "box-shadow 0.15s, border-color 0.15s",
    }}>
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: card.accent, borderRadius: "12px 12px 0 0",
      }} />

      {/* Icon + Sparkline */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "10px",
          background: `${card.accent}1a`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: card.accent,
          flexShrink: 0,
        }}>
          <SvgIcon name={card.icon} size={17} style={{ color: card.accent }} />
        </div>
        {card.sparkData && (
          <Sparkline data={card.sparkData} color={card.accent} width={74} height={30} />
        )}
      </div>

      {/* Value */}
      <div>
        <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-h)", letterSpacing: "-0.8px", lineHeight: 1 }}>
          {card.value}
        </div>
        {card.sub && (
          <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "3px", fontWeight: 400 }}>{card.sub}</div>
        )}
      </div>

      {/* Label + delta */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
        <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500, letterSpacing: "0.1px" }}>
          {card.label}
        </div>
        <div style={{
          fontSize: "11px", fontWeight: 700,
          padding: "2px 7px", borderRadius: "999px",
          background: card.deltaPositive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          color: card.deltaPositive ? "#059669" : "#dc2626",
          whiteSpace: "nowrap",
        }}>
          {card.deltaPositive ? "↑" : "↓"} {card.delta}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Quick Action Button
// ═══════════════════════════════════════════════════════════════════════════════
function QuickActionBtn({ action, onClick }: { action: typeof QUICK_ACTIONS[0]; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        padding: "16px 10px",
        background: hovered ? `${action.accent}08` : "var(--card-bg)",
        border: `1px solid ${hovered ? action.accent + "55" : "var(--card-border)"}`,
        borderRadius: "10px", cursor: "pointer",
        transition: "all 0.15s", textAlign: "center", minWidth: 0,
        boxShadow: hovered ? "var(--shadow)" : "var(--shadow-sm)",
      }}>
      <div style={{
        width: "40px", height: "40px", borderRadius: "10px",
        background: `${action.accent}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: action.accent, flexShrink: 0,
      }}>
        <SvgIcon name={action.icon} size={18} style={{ color: action.accent }} />
      </div>
      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-h)", whiteSpace: "nowrap" }}>
          {action.label}
        </div>
        <div style={{ fontSize: "10px", color: "var(--text)", lineHeight: 1.4, marginTop: "2px" }}>
          {action.description}
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Machine Status Card
// ═══════════════════════════════════════════════════════════════════════════════
const MACHINE_STATE_COLOR: Record<MachineStatus["state"], string> = {
  Running:     "#10b981",
  Idle:        "#94a3b8",
  Maintenance: "#f59e0b",
  Fault:       "#ef4444",
};

const MACHINE_STATE_BG: Record<MachineStatus["state"], string> = {
  Running:     "rgba(16,185,129,0.1)",
  Idle:        "rgba(148,163,184,0.12)",
  Maintenance: "rgba(245,158,11,0.1)",
  Fault:       "rgba(239,68,68,0.1)",
};

function MachineCard({ m }: { m: MachineStatus }) {
  const color = MACHINE_STATE_COLOR[m.state];
  const bg    = MACHINE_STATE_BG[m.state];
  return (
    <div style={{
      background: "var(--card-bg)", border: "1px solid var(--card-border)",
      borderRadius: "10px", padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: "10px",
      borderLeft: `3px solid ${color}`,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-h)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.name}
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--text)", marginTop: "1px" }}>{m.type}</div>
        </div>
        <span style={{
          fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
          background: bg, color: color, whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {m.state}
        </span>
      </div>

      {/* Utilization bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "10px", color: "var(--text)" }}>Utilization</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-h)" }}>{m.utilization}%</span>
        </div>
        <div style={{ height: "5px", borderRadius: "3px", background: "var(--card-border)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: "3px", width: `${m.utilization}%`, background: color, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--text)" }}>
        <span>Uptime: <strong style={{ color: "var(--text-h)" }}>{m.uptime}</strong></span>
        <span>{m.operator !== "—" ? m.operator : "—"}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Notification Item
// ═══════════════════════════════════════════════════════════════════════════════
const NOTIF_ICON: Record<string, string> = {
  error:   "⛔", warning: "⚠️", success: "✅", info: "ℹ️",
};
const NOTIF_BG: Record<string, string> = {
  error:   "rgba(239,68,68,0.06)",
  warning: "rgba(245,158,11,0.06)",
  success: "rgba(16,185,129,0.06)",
  info:    "rgba(59,130,246,0.06)",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Table column definitions
// ═══════════════════════════════════════════════════════════════════════════════

// Progress mini-bar
function ProgressBar({ value }: { value: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "80px" }}>
      <div style={{ flex: 1, height: "5px", borderRadius: "3px", background: "var(--card-border)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "3px", width: `${value}%`,
          background: value === 100 ? "#10b981" : value > 50 ? "#3b82f6" : "#f59e0b" }} />
      </div>
      <span style={{ fontSize: "10px", color: "var(--text)", fontWeight: 600, whiteSpace: "nowrap" }}>
        {value}%
      </span>
    </div>
  );
}

const mfgCols: Column<ManufacturingOrder>[] = [
  { key: "id",      header: "Order",    render: (r) => <span style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace", fontSize: "12px" }}>{r.id}</span> },
  { key: "product", header: "Product",  render: (r) => <span style={{ fontWeight: 500, color: "var(--text-h)", fontSize: "12px" }}>{r.product}</span> },
  { key: "qty",     header: "Qty",      render: (r) => <span style={{ color: "var(--text)", fontSize: "12px" }}>{r.qty.toLocaleString()} {r.unit}</span> },
  { key: "line",    header: "Line",     render: (r) => <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", background: "var(--table-stripe-bg)", color: "var(--text)" }}>{r.assignedLine}</span> },
  { key: "prio",    header: "Priority", render: (r) => <Badge variant={toBadgeVariant(r.priority)} label={r.priority} /> },
  { key: "status",  header: "Status",   render: (r) => <Badge variant={toBadgeVariant(r.status)}   label={r.status}   /> },
  { key: "prog",    header: "Progress", render: (r) => <ProgressBar value={r.progress ?? 0} /> },
  { key: "due",     header: "Due",      render: (r) => <span style={{ fontSize: "11.5px", color: "var(--text)" }}>{r.dueDate}</span> },
];

const invCols: Column<InventoryTransaction>[] = [
  { key: "id",        header: "Txn ID",    render: (r) => <span style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace", fontSize: "12px" }}>{r.id}</span> },
  { key: "item",      header: "Item",      render: (r) => <div><div style={{ fontWeight: 500, fontSize: "12px", color: "var(--text-h)" }}>{r.item}</div><div style={{ fontSize: "10px", color: "var(--text)", fontFamily: "monospace" }}>{r.sku}</div></div> },
  { key: "type",      header: "Type",      render: (r) => <Badge variant={toBadgeVariant(r.type)} label={r.type} /> },
  { key: "qty",       header: "Qty",       render: (r) => <span style={{ fontWeight: 600, fontSize: "12px", color: r.qty < 0 ? "var(--error-text)" : "var(--success-text)" }}>{r.qty > 0 ? "+" : ""}{r.qty} {r.unit}</span> },
  { key: "warehouse", header: "WH",        render: (r) => <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)" }}>{r.warehouse}</span> },
  { key: "value",     header: "Value",     render: (r) => <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-h)" }}>{r.value ?? "—"}</span> },
  { key: "date",      header: "Date",      render: (r) => <span style={{ fontSize: "11.5px", color: "var(--text)" }}>{r.date}</span> },
];

const poCols: Column<PurchaseOrder>[] = [
  { key: "id",       header: "PO #",       render: (r) => <span style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace", fontSize: "12px" }}>{r.id}</span> },
  { key: "supplier", header: "Supplier",   render: (r) => <span style={{ fontWeight: 500, fontSize: "12px", color: "var(--text-h)" }}>{r.supplier}</span> },
  { key: "items",    header: "Items",      render: (r) => <span style={{ fontSize: "12px", color: "var(--text)" }}>{r.items}</span> },
  { key: "amount",   header: "Amount",     render: (r) => <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--text-h)" }}>{r.amount}</span> },
  { key: "status",   header: "Status",     render: (r) => <Badge variant={toBadgeVariant(r.status)} label={r.status} /> },
  { key: "delivery", header: "Delivery",   render: (r) => <span style={{ fontSize: "11.5px", color: "var(--text)" }}>{r.deliveryDate}</span> },
];

const soCols: Column<SalesOrder>[] = [
  { key: "id",       header: "SO #",       render: (r) => <span style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "monospace", fontSize: "12px" }}>{r.id}</span> },
  { key: "customer", header: "Customer",   render: (r) => <span style={{ fontWeight: 500, fontSize: "12px", color: "var(--text-h)" }}>{r.customer}</span> },
  { key: "region",   header: "Region",     render: (r) => <span style={{ fontSize: "11px", color: "var(--text)", whiteSpace: "nowrap" }}>{r.region}</span> },
  { key: "amount",   header: "Amount",     render: (r) => <span style={{ fontWeight: 700, fontSize: "12px", color: "var(--text-h)" }}>{r.amount}</span> },
  { key: "status",   header: "Status",     render: (r) => <Badge variant={toBadgeVariant(r.status)} label={r.status} /> },
  { key: "date",     header: "Date",       render: (r) => <span style={{ fontSize: "11.5px", color: "var(--text)" }}>{r.date}</span> },
];

// ─── Maintenance urgency styling ──────────────────────────────────────────────
const URGENCY_COLOR: Record<MaintenanceItem["urgency"], string> = {
  Overdue:    "var(--error-text)",
  "Due Soon": "var(--warning-text)",
  Scheduled:  "#3b82f6",
};
const URGENCY_BG: Record<MaintenanceItem["urgency"], string> = {
  Overdue:    "var(--error-bg)",
  "Due Soon": "var(--warning-bg)",
  Scheduled:  "transparent",
};

// ─── System Health dot ─────────────────────────────────────────────────────────
const HEALTH_DOT: Record<SystemHealthItem["status"], string> = {
  Operational: "#10b981",
  Degraded:    "#f59e0b",
  Down:        "#ef4444",
};

// ─── Schedule type color ──────────────────────────────────────────────────────
const SCHEDULE_COLOR: Record<string, string> = {
  meeting:     "#3b82f6",
  production:  "#10b981",
  maintenance: "#f59e0b",
  review:      "#8b5cf6",
};

// ═══════════════════════════════════════════════════════════════════════════════
// Section header helper
// ═══════════════════════════════════════════════════════════════════════════════
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
      <div>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-h)", margin: 0, letterSpacing: "-0.2px" }}>{title}</h2>
        {subtitle && <p style={{ fontSize: "11.5px", color: "var(--text)", margin: "2px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── "View all" link button ────────────────────────────────────────────────────
function ViewAll({ label = "View all", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: "none", border: "1px solid var(--card-border)", padding: "5px 12px",
      borderRadius: "6px", fontSize: "11.5px", fontWeight: 600, color: "var(--text)",
      cursor: "pointer", whiteSpace: "nowrap",
    }}>
      {label} →
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Live KPI data from backend ─────────────────────────────────────────────
  const [liveKpis, setLiveKpis] = useState<Record<string, string>>({});

  useEffect(() => {
    reportsApi.dashboard().then((r) => {
      if (!r.data) return;
      const { orders, inventory, production, machines, employees } = r.data;
      const ordersTotal = orders?.reduce((a: number, o: { count: number }) => a + o.count, 0) ?? 0;
      const running     = machines?.find((m: { _id: string; count: number }) => m._id === "operational")?.count ?? 0;
      const lowStock    = inventory?.lowStock ?? 0;
      setLiveKpis({
        "mfg-orders":  String(ordersTotal),
        "low-stock":   String(lowStock),
        "machines":    String(running),
        "attendance":  String(employees ?? "—"),
        ...(production != null ? { "production": String(production) } : {}),
      });
    });
  }, []);

  // Merge live data into KPI_CARDS display
  const kpiCards = KPI_CARDS.map((card) => ({
    ...card,
    value: liveKpis[card.id] ?? card.value,
    ...(card.id === "machines" && liveKpis["machines"]
      ? { sub: `/ ${liveKpis["machines"]} running` }
      : {}),
  }));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const faultCount = MACHINE_STATUS.filter((m) => m.state === "Fault").length;
  const unreadNotifs = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* ══ PAGE HEADER ══════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
        padding: "20px 24px",
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "14px",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-h)", letterSpacing: "-0.5px" }}>
              {greeting}, {user?.name?.split(" ")[0] ?? "User"} 👋
            </div>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text)" }}>
            Smart Manufacturing ERP · {today}
          </p>
          {/* Status pills */}
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            {faultCount > 0 && (
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                ⛔ {faultCount} Machine Fault{faultCount > 1 ? "s" : ""}
              </span>
            )}
            {unreadNotifs > 0 && (
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: "rgba(245,158,11,0.1)", color: "#b45309" }}>
                🔔 {unreadNotifs} Unread
              </span>
            )}
            <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "999px", background: "rgba(16,185,129,0.1)", color: "#059669" }}>
              ✅ Shift Running
            </span>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "999px", background: "var(--table-stripe-bg)", color: "var(--text)" }}>
              📅 Day Shift · 08:00–16:30
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/dashboard/reports")}
            style={{ padding: "9px 16px", fontSize: "12.5px", fontWeight: 700, borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <SvgIcon name="chart" size={14} /> Reports
          </button>
          <button
            onClick={() => navigate("/dashboard/orders")}
            style={{ padding: "9px 18px", fontSize: "12.5px", fontWeight: 700, borderRadius: "8px", border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <SvgIcon name="factory" size={14} style={{ color: "#fff" }} /> New Order
          </button>
        </div>
      </div>

      {/* ══ KPI CARDS ════════════════════════════════════════════════════════ */}
      <div>
        <SectionHeader title="Key Performance Indicators" subtitle="Live plant-floor metrics · refreshed every minute" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
          gap: "14px",
        }}>
          {kpiCards.map((card) => (
            <KpiCardWidget key={card.id} card={card} />
          ))}
        </div>
      </div>

      {/* ══ QUICK ACTIONS ════════════════════════════════════════════════════ */}
      <Card
        title="Quick Actions"
        subtitle="Shortcuts to common ERP tasks"
        headerRight={<ViewAll label="All actions" />}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: "10px",
        }}>
          {QUICK_ACTIONS.map((a) => (
            <QuickActionBtn key={a.id} action={a} onClick={() => a.path && navigate(a.path)} />
          ))}
        </div>
      </Card>

      {/* ══ CHARTS ROW 1: Production + Revenue ═══════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "16px" }}>

        <Card
          title="Production Trend"
          subtitle="Monthly units · Actual vs Target"
          headerRight={
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text)" }}>
                <div style={{ width: "16px", height: "2.5px", background: "#3b82f6", borderRadius: "2px" }} /> Actual
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text)" }}>
                <div style={{ width: "16px", height: "0", borderTop: "2px dashed #8b5cf6" }} /> Target
              </span>
            </div>
          }
        >
          <LineChart
            data={PRODUCTION_TREND}
            color="#3b82f6" color2="#8b5cf6"
            height={200}
            formatY={(v) => `${(v / 1000).toFixed(1)}k`}
            showDots={false}
          />
        </Card>

        <Card
          title="Revenue vs Cost"
          subtitle="Monthly USD (thousands)"
          headerRight={
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text)" }}>
                <div style={{ width: "16px", height: "2.5px", background: "#10b981", borderRadius: "2px" }} /> Revenue
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "var(--text)" }}>
                <div style={{ width: "16px", height: "0", borderTop: "2px dashed #f59e0b" }} /> Cost
              </span>
            </div>
          }
        >
          <LineChart
            data={MONTHLY_REVENUE}
            color="#10b981" color2="#f59e0b"
            height={200}
            formatY={(v) => `$${v}k`}
            showDots={false}
          />
        </Card>
      </div>

      {/* ══ CHARTS ROW 2: Orders Bar + Inventory Donut ═══════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "16px" }}>
        <Card title="Weekly Manufacturing Orders" subtitle="Orders created per day — last 7 days">
          <BarChart data={WEEKLY_ORDERS} color="#8b5cf6" height={200} />
        </Card>
        <Card title="Inventory Distribution" subtitle="Stock value by category (%)">
          <DonutChart data={INVENTORY_DIST} size={160} thickness={34} />
        </Card>
      </div>

      {/* ══ MACHINE UTILIZATION + OEE GAUGES ═════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: "16px" }}>
        <Card title="Machine Utilization" subtitle="Current utilization by work center">
          <HorizontalBar data={MACHINE_UTILIZATION} />
        </Card>

        <Card title="Production Line OEE" subtitle="Overall Equipment Effectiveness">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {PRODUCTION_LINES.map((line) => (
              <GaugeBar
                key={line.line}
                value={line.oee}
                size={100}
                label={line.line}
                sublabel={`Eff: ${line.efficiency}%`}
              />
            ))}
          </div>
          {/* Summary row */}
          <div style={{
            marginTop: "16px", padding: "12px 14px", borderRadius: "8px",
            background: "var(--table-stripe-bg)", border: "1px solid var(--card-border)",
            display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px", textAlign: "center",
          }}>
            {PRODUCTION_LINES.map((line) => (
              <div key={line.line}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-h)" }}>{line.line}</div>
                <div style={{ fontSize: "10px", color: "var(--text)", marginTop: "2px" }}>{line.actual}/{line.target} units</div>
                <div style={{ fontSize: "10px", color: "#ef4444", marginTop: "1px" }}>Scrap: {line.scrapRate}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ══ MACHINE STATUS GRID ══════════════════════════════════════════════ */}
      <div>
        <SectionHeader
          title="Machine Status"
          subtitle={`${MACHINE_STATUS.filter(m => m.state === "Running").length} running · ${MACHINE_STATUS.filter(m => m.state === "Fault").length} fault · ${MACHINE_STATUS.filter(m => m.state === "Maintenance").length} maintenance`}
          action={<ViewAll label="All machines" onClick={() => navigate("/dashboard/machines")} />}
        />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "12px",
        }}>
          {MACHINE_STATUS.map((m) => (
            <MachineCard key={m.id} m={m} />
          ))}
        </div>
      </div>

      {/* ══ MAIN CONTENT + RIGHT PANEL ═══════════════════════════════════════ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) 320px",
        gap: "20px",
        alignItems: "start",
      }}>

        {/* ── LEFT COLUMN ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 }}>

          {/* Manufacturing Orders */}
          <Card
            title="Recent Manufacturing Orders"
            subtitle="Active and planned production orders"
            noPadding
            headerRight={<ViewAll onClick={() => navigate("/dashboard/production")} />}
          >
            <DataTable columns={mfgCols} rows={RECENT_MFG_ORDERS} rowKey={(r) => r.id} />
          </Card>

          {/* Inventory Transactions */}
          <Card
            title="Recent Inventory Transactions"
            subtitle="Stock movements across all warehouses"
            noPadding
            headerRight={<ViewAll onClick={() => navigate("/dashboard/inventory")} />}
          >
            <DataTable columns={invCols} rows={RECENT_INV_TXNS} rowKey={(r) => r.id} />
          </Card>

          {/* PO + SO side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "16px" }}>
            <Card title="Recent Purchase Orders" subtitle="Supplier procurement" noPadding
              headerRight={<ViewAll onClick={() => navigate("/dashboard/purchase")} />}>
              <DataTable columns={poCols} rows={RECENT_PO} rowKey={(r) => r.id} />
            </Card>
            <Card title="Recent Sales Orders" subtitle="Customer orders" noPadding
              headerRight={<ViewAll onClick={() => navigate("/dashboard/orders")} />}>
              <DataTable columns={soCols} rows={RECENT_SO} rowKey={(r) => r.id} />
            </Card>
          </div>

          {/* Notifications feed */}
          <Card
            title="Recent Notifications"
            subtitle={`${unreadNotifs} unread · ${NOTIFICATIONS.length} total`}
            headerRight={<ViewAll label="All notifications" />}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {NOTIFICATIONS.map((n) => (
                <div key={n.id} style={{
                  display: "flex", gap: "12px", padding: "11px 13px",
                  borderRadius: "8px",
                  background: n.read ? "transparent" : NOTIF_BG[n.level],
                  border: "1px solid var(--card-border)",
                  transition: "background 0.15s",
                }}>
                  <div style={{ fontSize: "16px", flexShrink: 0, lineHeight: 1.5 }}>
                    {NOTIF_ICON[n.level]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-h)" }}>{n.title}</div>
                      <span style={{ fontSize: "10.5px", color: "var(--text)", whiteSpace: "nowrap" }}>{n.time}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text)", marginTop: "2px", lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: "10px", color: "var(--text)", marginTop: "3px", fontWeight: 600, opacity: 0.7 }}>
                      {n.module}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--accent)", marginTop: "5px", flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Upcoming Maintenance */}
          <Card title="Upcoming Maintenance" subtitle="Scheduled & overdue tasks"
            headerRight={<ViewAll onClick={() => navigate("/dashboard/maintenance")} />}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {MAINTENANCE_ITEMS.map((m) => (
                <div key={m.machine} style={{
                  display: "flex", gap: "10px", padding: "11px 12px",
                  borderRadius: "8px", border: "1px solid var(--card-border)",
                  background: URGENCY_BG[m.urgency],
                  borderLeft: `3px solid ${URGENCY_COLOR[m.urgency]}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6px" }}>
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-h)" }}>{m.machine}</div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: URGENCY_COLOR[m.urgency], whiteSpace: "nowrap" }}>
                        {m.urgency}
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "var(--text)", marginTop: "2px" }}>{m.type}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10.5px", color: "var(--text)" }}>
                      <span>Due: <strong style={{ color: "var(--text-h)" }}>{m.due}</strong></span>
                      <span>{m.estimatedHours}h · {m.assignedTo.split(" ")[0]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Today's Schedule */}
          <Card title="Today's Schedule" subtitle={`${SCHEDULE_ITEMS.length} events`}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {SCHEDULE_ITEMS.map((s, i) => (
                <div key={i} style={{
                  display: "flex", gap: "12px",
                  paddingBottom: i < SCHEDULE_ITEMS.length - 1 ? "12px" : 0,
                  marginBottom: i < SCHEDULE_ITEMS.length - 1 ? "12px" : 0,
                  borderBottom: i < SCHEDULE_ITEMS.length - 1 ? "1px solid var(--card-border)" : "none",
                }}>
                  {/* Timeline dot + line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "32px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: SCHEDULE_COLOR[s.type], flexShrink: 0, marginTop: "4px" }} />
                    {i < SCHEDULE_ITEMS.length - 1 && (
                      <div style={{ width: "1px", flex: 1, background: "var(--card-border)", marginTop: "3px", minHeight: "12px" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: SCHEDULE_COLOR[s.type], marginBottom: "1px" }}>
                      {s.time}
                    </div>
                    <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-h)", lineHeight: 1.3 }}>{s.event}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--text)" }}>{s.location}</span>
                      {s.attendees && (
                        <span style={{ fontSize: "10px", color: "var(--text)" }}>👥 {s.attendees}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pending Approvals */}
          <Card title="Pending Approvals" subtitle={`${PENDING_APPROVALS.length} awaiting action`}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {PENDING_APPROVALS.map((a) => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "8px", padding: "10px 12px", borderRadius: "8px",
                  border: "1px solid var(--card-border)",
                  borderLeft: `3px solid ${a.priority === "High" ? "#ef4444" : a.priority === "Medium" ? "#f59e0b" : "#94a3b8"}`,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--text-h)" }}>{a.type}</div>
                    <div style={{ fontSize: "10.5px", color: "var(--text)", marginTop: "1px" }}>
                      {a.requestedBy} · {a.submittedAt}
                    </div>
                    {a.amount && (
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)", marginTop: "2px" }}>{a.amount}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <button style={{ padding: "5px 9px", fontSize: "11px", fontWeight: 700, borderRadius: "6px", border: "none", background: "rgba(16,185,129,0.12)", color: "#059669", cursor: "pointer" }}>
                      ✓
                    </button>
                    <button style={{ padding: "5px 9px", fontSize: "11px", fontWeight: 700, borderRadius: "6px", border: "none", background: "rgba(239,68,68,0.1)", color: "#dc2626", cursor: "pointer" }}>
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* System Health */}
          <Card title="System Health" subtitle="Live service status">
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {SYSTEM_HEALTH.map((s) => (
                <div key={s.service} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 10px", borderRadius: "7px",
                  background: s.status !== "Operational" ? "rgba(245,158,11,0.04)" : "transparent",
                  border: "1px solid var(--card-border)",
                  gap: "8px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: HEALTH_DOT[s.status],
                      boxShadow: `0 0 5px ${HEALTH_DOT[s.status]}66`,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "12.5px", fontWeight: 500, color: "var(--text-h)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.service}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "10.5px", fontWeight: 700, color: HEALTH_DOT[s.status] }}>{s.status}</div>
                    <div style={{ fontSize: "9.5px", color: "var(--text)" }}>{s.uptime} · {s.responseTime}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>

    </div>
  );
}
