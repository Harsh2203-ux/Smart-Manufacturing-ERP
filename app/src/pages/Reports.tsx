import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, Input, Select, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { reportsApi, type ReportRecord } from "../api/businessApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  "production_summary", "purchase_summary", "inventory_summary",
  "employee_summary", "machine_utilisation", "financial_overview", "sales_summary", "custom",
];

const TYPE_LABEL: Record<string, string> = {
  production_summary: "Production", purchase_summary: "Purchase",
  inventory_summary: "Inventory", employee_summary: "HR",
  machine_utilisation: "Machines", financial_overview: "Financial",
  sales_summary: "Sales", custom: "Custom",
};

const FORMAT_OPTIONS = ["PDF", "XLSX", "CSV"];

const STATUS_VARIANT: Record<ReportRecord["status"], "success" | "warning" | "error" | "info" | "neutral"> = {
  pending: "neutral", running: "info", completed: "success", failed: "error",
};

const STATUS_LABEL: Record<ReportRecord["status"], string> = {
  pending: "Pending", running: "Generating", completed: "Ready", failed: "Failed",
};

const FORMAT_COLOR: Record<string, string> = { PDF: "#dc2626", XLSX: "#16a34a", CSV: "#2563eb" };

const TYPE_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  production_summary: "info", purchase_summary: "neutral", inventory_summary: "neutral",
  employee_summary: "info", machine_utilisation: "warning", financial_overview: "success",
  sales_summary: "success", custom: "neutral",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [reports, setReports]       = useState<ReportRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [form, setForm]             = useState({ title: "", type: "production_summary", format: "PDF" });

  const load = useCallback(async () => {
    setLoading(true);
    const r = await reportsApi.list();
    if (r.data) setReports(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Poll for running reports to show completion
  useEffect(() => {
    const running = reports.some((r) => r.status === "running" || r.status === "pending");
    if (!running) return;
    const t = setTimeout(() => void load(), 5000);
    return () => clearTimeout(t);
  }, [reports, load]);

  const ready      = reports.filter((r) => r.status === "completed").length;
  const generating = reports.filter((r) => r.status === "running" || r.status === "pending").length;
  const failed     = reports.filter((r) => r.status === "failed").length;

  function openCreate() { setForm({ title: "", type: "production_summary", format: "PDF" }); setFormError(""); setCreateOpen(true); }

  async function handleGenerate() {
    if (!form.title.trim()) { setFormError("Report title is required."); return; }
    setSaving(true); setFormError("");
    const r = await reportsApi.create({ title: form.title, type: form.type, format: form.format });
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    setCreateOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await reportsApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  return (
    <PageShell
      title="Reports"
      subtitle="Scheduled and on-demand operational reports across all modules."
      action={<ActionButton label="+ Generate Report" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Ready to Download" value={String(ready)}      sub="Export-ready reports"     accent />
        <KpiCard label="Generating"        value={String(generating)} sub="Processing in background"        />
        <KpiCard label="Failed"            value={String(failed)}     sub="Requires retry"                  />
        <KpiCard label="Total Reports"     value={String(reports.length)} sub="All time"                    />
      </div>

      {/* Report list */}
      <SectionCard title="Report Registry" subtitle={loading ? "Loading…" : `${reports.length} reports`}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "var(--table-head-bg)", textAlign: "left" }}>
                {["Report ID", "Title", "Type", "Format", "Status", "Generated At", "Actions"].map((col) => (
                  <th key={col} style={{ padding: "10px 20px", fontWeight: 600, color: "var(--text)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid var(--card-border)", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "var(--text)" }}>Loading…</td>
                </tr>
              )}
              {!loading && reports.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 20px", textAlign: "center", color: "var(--text)" }}>No reports yet. Generate your first report.</td>
                </tr>
              )}
              {reports.map((r, idx) => (
                <tr key={r._id} style={{ background: idx % 2 === 0 ? "transparent" : "var(--table-stripe-bg)" }}>
                  <td style={{ padding: "13px 20px", fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", whiteSpace: "nowrap" }}>
                    {r._id.slice(-8).toUpperCase()}
                  </td>
                  <td style={{ padding: "13px 20px", color: "var(--text-h)", fontWeight: 500, maxWidth: "280px" }}>
                    {r.title}
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <StatusPill label={TYPE_LABEL[r.type] ?? r.type} variant={TYPE_VARIANT[r.type] ?? "neutral"} />
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    {r.format ? (
                      <span style={{ fontWeight: 700, fontSize: "11px", color: FORMAT_COLOR[r.format] ?? "var(--text)", letterSpacing: "0.5px" }}>
                        {r.format}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <StatusPill label={STATUS_LABEL[r.status]} variant={STATUS_VARIANT[r.status]} />
                  </td>
                  <td style={{ padding: "13px 20px", color: "var(--text)", whiteSpace: "nowrap" }}>
                    {r.generatedAt ? new Date(r.generatedAt).toLocaleString() : r.status === "running" ? "Processing…" : "—"}
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <button
                      onClick={() => setDeleteId(r._id)}
                      style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Generate Report Modal */}
      <Modal open={createOpen} title="Generate Report" onClose={() => setCreateOpen(false)} width={480}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Report Title" required>
            <Input value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="e.g. Monthly Production Summary" />
          </FormField>
          <FormField label="Report Type">
            <Select value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v }))} options={REPORT_TYPES} />
          </FormField>
          <FormField label="Format">
            <Select value={form.format} onChange={(v) => setForm((p) => ({ ...p, format: v }))} options={FORMAT_OPTIONS} />
          </FormField>
        </FormGrid>
        <FormActions onCancel={() => setCreateOpen(false)} onSubmit={handleGenerate} submitLabel="Generate" loading={saving} />
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Report"
        message="Delete this report permanently?" onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)} danger />
    </PageShell>
  );
}
