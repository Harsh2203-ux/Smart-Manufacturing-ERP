import { useState, useEffect } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, KpiCard, SectionCard } from "../components/ui";
import {
  analyticsApi,
  type AnalyticsSummary,
  type AnalyticsLinePoint,
  type AnalyticsOrderStatus,
  type AnalyticsBottomCards,
} from "../api/businessApi";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BarDataPoint {
  label: string;
  value: number;
  max: number;
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

// ─── Order status colours ─────────────────────────────────────────────────────

const ORDER_STATUS_COLOR: Record<string, string> = {
  delivered:    "var(--success-text)",
  shipped:      "var(--accent)",
  confirmed:    "var(--info-text, var(--accent))",
  in_production:"var(--warning-text)",
  pending:      "var(--warning-text)",
  draft:        "var(--text)",
  on_hold:      "var(--text)",
  cancelled:    "var(--error-text)",
  returned:     "var(--error-text)",
};

function labelStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function TrendChip({ trend }: { trend: number | null }) {
  if (trend === null) {
    return <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text)", background: "var(--card-border)", padding: "2px 8px", borderRadius: "999px", marginLeft: "8px" }}>—</span>;
  }
  const up    = trend >= 0;
  const color = up ? "var(--success-text)" : "var(--error-text)";
  const bg    = up ? "var(--success-bg)"   : "var(--error-bg)";
  return (
    <span style={{ fontSize: "11px", fontWeight: 600, color, background: bg, padding: "2px 8px", borderRadius: "999px", marginLeft: "8px", whiteSpace: "nowrap" }}>
      {up ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

interface MetricItem { label: string; value: string; sub: string; trend: number | null; }
function MetricCard({ item }: { item: MetricItem }) {
  return (
    <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "10px", padding: "20px 24px", flex: "1 1 180px", minWidth: 0 }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>{item.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-h)", letterSpacing: "-0.5px" }}>{item.value}</span>
        <TrendChip trend={item.trend} />
      </div>
      <div style={{ fontSize: "12px", color: "var(--text)", marginTop: "4px" }}>{item.sub}</div>
    </div>
  );
}

function HorizontalBar({ items, unit = "" }: { items: BarDataPoint[]; unit?: string }) {
  if (!items.length) {
    return <div style={{ padding: "32px 24px", color: "var(--text)", fontSize: "13px", textAlign: "center" }}>No data for this period.</div>;
  }
  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {items.map((item) => {
        const pct = Math.round((item.value / item.max) * 100);
        return (
          <div key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", color: "var(--text-h)", fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontSize: "13px", color: "var(--text)", fontWeight: 600 }}>{item.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}{unit}</span>
            </div>
            <div style={{ height: "8px", borderRadius: "999px", background: "var(--card-border)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: "999px", transition: "width 0.4s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  if (!segments.length) {
    return <div style={{ padding: "32px 24px", color: "var(--text)", fontSize: "13px", textAlign: "center" }}>No order data for this period.</div>;
  }
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {segments.map((seg) => {
          const pct = Math.round((seg.value / total) * 100);
          return (
            <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 140px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: seg.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-h)" }}>{seg.value} <span style={{ color: seg.color }}>({pct}%)</span></div>
                <div style={{ fontSize: "11px", color: "var(--text)" }}>{seg.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", height: "12px", borderRadius: "999px", overflow: "hidden", marginTop: "20px", gap: "2px" }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ flexBasis: `${(seg.value / total) * 100}%`, background: seg.color, transition: "flex-basis 0.4s ease" }} />
        ))}
      </div>
      <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text)", textAlign: "right" }}>Total: {total} orders</div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function naStr(v: number | null, fmt: (n: number) => string, fallback = "—") {
  return v === null || v === undefined ? fallback : fmt(v);
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function buildCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          // Quote any cell that contains a comma, double-quote, or newline
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\r\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [summary,    setSummary]    = useState<AnalyticsSummary | null>(null);
  const [byLine,     setByLine]     = useState<AnalyticsLinePoint[]>([]);
  const [qualLine,   setQualLine]   = useState<AnalyticsLinePoint[]>([]);
  const [orderStatus,setOrderStatus]= useState<AnalyticsOrderStatus[]>([]);
  const [bottomCards,setBottomCards]= useState<AnalyticsBottomCards | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [exportMsg,  setExportMsg]  = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.summary(),
      analyticsApi.productionByLine(),
      analyticsApi.qualityByLine(),
      analyticsApi.orderStatus(),
      analyticsApi.bottomCards(),
    ]).then(([s, bl, ql, os, bc]) => {
      if (s.data)              setSummary(s.data);
      if (bl.data)             setByLine(Array.isArray(bl.data) ? bl.data : []);
      if (ql.data)             setQualLine(Array.isArray(ql.data) ? ql.data : []);
      if (os.data)             setOrderStatus(Array.isArray(os.data) ? os.data : []);
      if (bc.data)             setBottomCards(bc.data);
      setLoading(false);
    });
  }, []);

  // ── Build KPI metric cards from real data ─────────────────────────────────

  const kpis: MetricItem[] = [
    {
      label: "Revenue (MTD)",
      value: summary ? formatRevenue(summary.revenue.value) : "—",
      sub:   "Sales orders this month",
      trend: summary?.revenue.trend ?? null,
    },
    {
      label: "Production Output",
      value: summary ? summary.productionOutput.value.toLocaleString() : "—",
      sub:   "Units produced this month",
      trend: summary?.productionOutput.trend ?? null,
    },
    {
      label: "On-Time Delivery",
      value: summary?.onTimeDelivery.value !== null && summary?.onTimeDelivery.value !== undefined
        ? `${summary.onTimeDelivery.value.toFixed(1)}%`
        : "—",
      sub:   summary?.onTimeDelivery.ordersTotal
        ? `${summary.onTimeDelivery.ordersTotal} orders`
        : "No orders this month",
      trend: null, // no prior-period comparison stored
    },
    {
      label: "Overall OEE",
      value: naStr(summary?.oee?.value ?? null, (n) => `${n.toFixed(1)}%`),
      sub:   "Avg target across active machines",
      trend: null, // oeeActual not tracked per-period
    },
    {
      label: "Defect Rate",
      value: naStr(summary?.defectRate?.value ?? null, (n) => `${n.toFixed(2)}%`),
      sub:   "Avg across QC checks this month",
      trend: null,
    },
    {
      label: "Avg Lead Time",
      value: naStr(summary?.avgLeadTime?.value ?? null, (n) => `${n.toFixed(1)}d`),
      sub:   "Product lead time (catalogue avg)",
      trend: null,
    },
  ];

  // ── Production-by-line bar chart ──────────────────────────────────────────
  // Uses QC checks per line as a proxy for production line activity
  const maxChecks = byLine.reduce((m, l) => Math.max(m, l.checks ?? 0), 1);
  const productionBars: BarDataPoint[] = byLine.map((l) => ({
    label: l._id,
    value: l.checks ?? 0,
    max:   maxChecks,
  }));

  // ── Quality pass-rate by line ─────────────────────────────────────────────
  const qualBars: BarDataPoint[] = qualLine.map((l) => ({
    label: l._id,
    value: parseFloat((l.passRate ?? 0).toFixed(1)),
    max:   100,
  }));

  // ── Order status donut ────────────────────────────────────────────────────
  const donutSegments: DonutSegment[] = orderStatus.map((o) => ({
    label: labelStatus(o._id),
    value: o.count,
    color: ORDER_STATUS_COLOR[o._id] ?? "var(--text)",
  }));

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    if (loading) {
      setExportMsg({ text: "Data is still loading — please wait.", ok: false });
      setTimeout(() => setExportMsg(null), 3000);
      return;
    }

    const now    = new Date();
    const month  = now.toLocaleString("default", { month: "long", year: "numeric" });
    const stamp  = now.toISOString().slice(0, 10);

    const rows: (string | number)[][] = [];

    // ── Section 1: KPI Summary ─────────────────────────────────────────────
    rows.push(["ANALYTICS REPORT — " + month]);
    rows.push(["Generated", new Date().toLocaleString()]);
    rows.push([]);
    rows.push(["KPI SUMMARY"]);
    rows.push(["Metric", "Value", "Sub-label", "Trend"]);
    kpis.forEach((k) => {
      rows.push([k.label, k.value, k.sub, k.trend !== null ? `${k.trend >= 0 ? "+" : ""}${k.trend.toFixed(1)}%` : "—"]);
    });

    // ── Section 2: Bottom Cards ────────────────────────────────────────────
    rows.push([]);
    rows.push(["BOTTOM CARDS"]);
    rows.push(["Metric", "Value"]);
    if (bottomCards) {
      rows.push(["Top Product (by units produced)",  bottomCards.topProduct  ?? "—"]);
      rows.push(["Top Customer (by sales value)",    bottomCards.topCustomer ?? "—"]);
      rows.push(["Top Supplier (by purchase value)", bottomCards.topSupplier ?? "—"]);
      rows.push(["Open Work Orders",                 bottomCards.openWorkOrders]);
      rows.push(["Scheduled Preventive Maintenance", bottomCards.scheduledPM]);
      rows.push(["Purchase Orders Pending",          bottomCards.posPending]);
    }

    // ── Section 3: QC Inspections by Production Line ───────────────────────
    rows.push([]);
    rows.push(["QC INSPECTIONS BY PRODUCTION LINE"]);
    rows.push(["Line", "QC Checks (this month)"]);
    productionBars.forEach((b) => rows.push([b.label, b.value]));

    // ── Section 4: Quality Pass Rate by Line ──────────────────────────────
    rows.push([]);
    rows.push(["QUALITY PASS RATE BY LINE"]);
    rows.push(["Line", "Pass Rate (%)", "Total Checks", "Passed"]);
    qualLine.forEach((l) => {
      rows.push([l._id, (l.passRate ?? 0).toFixed(1), l.total ?? 0, l.passed ?? 0]);
    });

    // ── Section 5: Sales Order Status Distribution ─────────────────────────
    rows.push([]);
    rows.push(["SALES ORDER STATUS DISTRIBUTION"]);
    rows.push(["Status", "Count"]);
    donutSegments.forEach((s) => rows.push([s.label, s.value]));

    try {
      downloadCsv(buildCsv(rows), `analytics-report-${stamp}.csv`);
      setExportMsg({ text: "Report exported successfully.", ok: true });
    } catch {
      setExportMsg({ text: "Export failed — please try again.", ok: false });
    }
    setTimeout(() => setExportMsg(null), 4000);
  }

  return (
    <PageShell
      title="Analytics"
      subtitle="Business intelligence, KPIs, production metrics, and performance dashboards."
      action={<ActionButton label="Export Report" onClick={handleExport} />}
    >
      {/* Export feedback banner */}
      {exportMsg && (
        <div style={{
          marginBottom: "16px",
          padding: "10px 16px",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 600,
          background: exportMsg.ok ? "var(--success-bg)" : "var(--error-bg)",
          color:      exportMsg.ok ? "var(--success-text)" : "var(--error-text)",
          border:     `1px solid ${exportMsg.ok ? "var(--success-text)" : "var(--error-text)"}`,
        }}>
          {exportMsg.ok ? "✓" : "✗"} {exportMsg.text}
        </div>
      )}

      {/* Period selector — visual only; data is always MTD from backend */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
        {(["Today", "This Week", "This Month", "This Quarter", "This Year"] as const).map((period, i) => (
          <button key={period} style={{
            padding: "6px 14px", borderRadius: "6px",
            border: `1px solid ${i === 2 ? "var(--accent)" : "var(--card-border)"}`,
            background: i === 2 ? "var(--accent)" : "var(--card-bg)",
            color: i === 2 ? "#fff" : "var(--text)",
            fontSize: "13px", cursor: "default",
            fontWeight: i === 2 ? 600 : 400,
          }}>
            {period}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "13px", color: "var(--text)", alignSelf: "center" }}>
          {loading ? "Loading data…" : "Month-to-date from database"}
        </span>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        {kpis.map((k) => <MetricCard key={k.label} item={k} />)}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px", marginBottom: "20px" }}>
        <SectionCard
          title="QC Inspections by Production Line"
          subtitle={byLine.length ? "Checks recorded this month" : loading ? "Loading…" : "No QC data recorded yet"}
        >
          <HorizontalBar items={productionBars} />
        </SectionCard>

        <SectionCard
          title="Quality Pass Rate by Line"
          subtitle={qualLine.length ? "First-pass yield %" : loading ? "Loading…" : "No QC data recorded yet"}
        >
          <HorizontalBar items={qualBars} unit="%" />
        </SectionCard>

        <SectionCard
          title="Sales Order Status Distribution"
          subtitle={orderStatus.length ? "All sales orders this month" : loading ? "Loading…" : "No orders this month"}
        >
          <DonutChart segments={donutSegments} />
        </SectionCard>
      </div>

      {/* Bottom metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <KpiCard
          label="Top Product"
          value={bottomCards?.topProduct ?? (loading ? "…" : "—")}
          sub="By units produced this month"
        />
        <KpiCard
          label="Top Customer"
          value={bottomCards?.topCustomer ?? (loading ? "…" : "—")}
          sub="By sales order value"
        />
        <KpiCard
          label="Top Supplier"
          value={bottomCards?.topSupplier ?? (loading ? "…" : "—")}
          sub="By purchase order value"
        />
        <KpiCard
          label="Open Work Orders"
          value={bottomCards !== null ? String(bottomCards.openWorkOrders) : (loading ? "…" : "—")}
          sub="In progress"
        />
        <KpiCard
          label="Scheduled PM"
          value={bottomCards !== null ? String(bottomCards.scheduledPM) : (loading ? "…" : "—")}
          sub="Preventive tasks this week"
        />
        <KpiCard
          label="POs Pending"
          value={bottomCards !== null ? String(bottomCards.posPending) : (loading ? "…" : "—")}
          sub="Draft / pending approval"
          accent={bottomCards !== null && bottomCards.posPending > 0}
        />
      </div>
    </PageShell>
  );
}
