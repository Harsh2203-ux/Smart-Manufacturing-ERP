import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, Input, Select, Textarea, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { qualityApi, type QualityCheckRecord } from "../api/businessApi";
import { productsApi } from "../api/manufacturingApi";
import type { ProductRecord } from "../api/manufacturingApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const RESULTS: QualityCheckRecord["result"][] = ["Pass", "Fail", "Conditional Pass", "Under Review"];
const LINES = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Assembly", "QC Lab", "Other"];

const STATUS_VARIANT: Record<QualityCheckRecord["result"], "success" | "warning" | "error" | "info" | "neutral"> = {
  "Pass":             "success",
  "Fail":             "error",
  "Conditional Pass": "warning",
  "Under Review":     "info",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getProductName(p: QualityCheckRecord["product"]): string {
  if (!p) return "—";
  if (typeof p === "string") return p;
  return p.name;
}

function blank(): Partial<QualityCheckRecord> & Record<string, unknown> {
  return {
    batch: "", productName: "", line: "Line 1", inspector: "",
    sampleSize: 50, defects: 0,
    result: "Under Review", notes: "",
    inspectedAt: new Date().toISOString().slice(0, 16),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Quality() {
  const [items, setItems]           = useState<QualityCheckRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [resultFilter, setResult]   = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<QualityCheckRecord | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<QualityCheckRecord | null>(null);
  const [form, setForm]             = useState<Partial<QualityCheckRecord> & Record<string, unknown>>(blank());
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [products, setProducts]     = useState<ProductRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (resultFilter !== "all") params.result = resultFilter;
    const r = await qualityApi.list(params);
    if (r.data) setItems(r.data);
    setLoading(false);
  }, [search, resultFilter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    productsApi.list({ limit: "200" }).then((r) => {
      if (r.data) setProducts(r.data as unknown as ProductRecord[]);
    });
  }, []);

  const passed  = items.filter((c) => c.result === "Pass").length;
  const failed  = items.filter((c) => c.result === "Fail").length;
  const pending = items.filter((c) => c.result === "Under Review").length;
  const avgDefect = items.length > 0
    ? (items.reduce((sum, c) => sum + (c.defectRate ?? 0), 0) / items.length).toFixed(2)
    : "0.00";

  function openCreate() { setForm(blank()); setFormError(""); setCreateOpen(true); }
  function openEdit(c: QualityCheckRecord) { setForm({ ...c }); setFormError(""); setEditItem(c); }
  function closeModals() { setCreateOpen(false); setEditItem(null); setDeleteId(null); setDetailItem(null); setFormError(""); }

  async function handleSave() {
    if (!String(form.batch ?? "").trim()) { setFormError("Batch identifier is required."); return; }
    if (!Number(form.sampleSize) || Number(form.sampleSize) < 1) { setFormError("Sample size must be at least 1."); return; }
    if (Number(form.defects) > Number(form.sampleSize)) { setFormError("Defects cannot exceed sample size."); return; }
    setSaving(true); setFormError("");
    const r = editItem
      ? await qualityApi.update(editItem._id, form)
      : await qualityApi.create(form);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    closeModals();
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await qualityApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  return (
    <PageShell
      title="Quality Control"
      subtitle="Batch inspections, defect tracking, and quality reports."
      action={<ActionButton label="+ New Inspection" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Avg Defect Rate" value={`${avgDefect}%`}  sub="Across active batches" accent />
        <KpiCard label="Passed"          value={String(passed)}   sub="Quality checks passed"        />
        <KpiCard label="Failed"          value={String(failed)}   sub="Require rework"               />
        <KpiCard label="Under Review"    value={String(pending)}  sub="Awaiting sign-off"            />
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search batch, product, inspector…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        {(["all", ...RESULTS] as const).map((f) => (
          <button key={f} onClick={() => setResult(f)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${resultFilter === f ? "var(--accent)" : "var(--card-border)"}`, background: resultFilter === f ? "var(--accent)" : "var(--card-bg)", color: resultFilter === f ? "#fff" : "var(--text)", fontSize: "12px", cursor: "pointer" }}>
            {f === "all" ? "All" : f}
          </button>
        ))}
      </div>

      {/* Inspection log table */}
      <SectionCard title="Inspection Log" subtitle={loading ? "Loading…" : `${items.length} inspections`}>
        <DataTable columns={["Check ID", "Batch", "Product", "Line", "Inspector", "Sample", "Defects", "Defect Rate", "Result", "Date", "Actions"]}>
          {items.map((check, idx) => (
            <DataRow key={check._id} index={idx} cells={[
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailItem(check)}>
                {check.checkNumber}
              </span>,
              check.batch,
              <span style={{ cursor: "pointer" }} onClick={() => setDetailItem(check)}>
                {check.productName || getProductName(check.product)}
              </span>,
              check.line || "—",
              check.inspector || "—",
              String(check.sampleSize),
              String(check.defects),
              <span style={{ fontWeight: 600, color: check.defectRate === 0 ? "var(--success-text)" : check.defectRate >= 5 ? "var(--error-text)" : "var(--warning-text)" }}>
                {check.defectRate?.toFixed(1) ?? "0.0"}%
              </span>,
              <StatusPill label={check.result} variant={STATUS_VARIANT[check.result]} />,
              new Date(check.inspectedAt || check.createdAt).toLocaleString(),
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(check)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>Edit</button>
                <button onClick={() => setDeleteId(check._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>Delete</button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && items.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>
            No inspections found.{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} onClick={openCreate}>
              Create the first one →
            </span>
          </div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editItem} title={editItem ? "Edit Inspection" : "New Inspection"} onClose={closeModals} width={600}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Batch ID" required>
            <Input value={String(form.batch ?? "")} onChange={(v) => setForm((p) => ({ ...p, batch: v }))} placeholder="e.g. Batch-22" />
          </FormField>
          <FormField label="Production Line">
            <Select value={String(form.line ?? "Line 1")} onChange={(v) => setForm((p) => ({ ...p, line: v }))} options={LINES} />
          </FormField>
          <FormField label="Product (optional)">
            <select
              value={String(form.product ?? "")}
              onChange={(e) => {
                const pid = e.target.value;
                const prod = products.find((p) => p._id === pid);
                setForm((prev) => ({ ...prev, product: pid, productName: prod?.name ?? "" }));
              }}
              style={{ border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", width: "100%" }}
            >
              <option value="">— Select product (optional) —</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
            </select>
          </FormField>
          <FormField label="Product Name (free text)">
            <Input value={String(form.productName ?? "")} onChange={(v) => setForm((p) => ({ ...p, productName: v }))} placeholder="or type product name" />
          </FormField>
          <FormField label="Inspector">
            <Input value={String(form.inspector ?? "")} onChange={(v) => setForm((p) => ({ ...p, inspector: v }))} placeholder="Inspector name" />
          </FormField>
          <FormField label="Sample Size" required>
            <Input value={String(form.sampleSize ?? 50)} onChange={(v) => setForm((p) => ({ ...p, sampleSize: Number(v) }))} placeholder="e.g. 50" />
          </FormField>
          <FormField label="Defects Found">
            <Input value={String(form.defects ?? 0)} onChange={(v) => setForm((p) => ({ ...p, defects: Number(v) }))} placeholder="e.g. 2" />
          </FormField>
          <FormField label="Result">
            <Select value={String(form.result ?? "Under Review")} onChange={(v) => setForm((p) => ({ ...p, result: v as QualityCheckRecord["result"] }))} options={[...RESULTS]} />
          </FormField>
          <FormField label="Inspection Date/Time">
            <Input value={String(form.inspectedAt ?? "").slice(0, 16)} onChange={(v) => setForm((p) => ({ ...p, inspectedAt: v }))} placeholder="YYYY-MM-DDTHH:MM" />
          </FormField>
        </FormGrid>
        <FormField label="Notes" style={{ padding: "0 0 8px" }}>
          <Textarea value={String(form.notes ?? "")} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Optional notes…" rows={2} />
        </FormField>
        <FormActions onCancel={closeModals} onSubmit={handleSave} submitLabel={editItem ? "Update" : "Create"} loading={saving} />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Inspection Details" onClose={() => setDetailItem(null)} width={480}>
        {detailItem && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              ["Check #", detailItem.checkNumber],
              ["Batch", detailItem.batch],
              ["Product", detailItem.productName || getProductName(detailItem.product)],
              ["Line", detailItem.line || "—"],
              ["Inspector", detailItem.inspector || "—"],
              ["Sample Size", String(detailItem.sampleSize)],
              ["Defects", String(detailItem.defects)],
              ["Defect Rate", `${detailItem.defectRate?.toFixed(2) ?? 0}%`],
              ["Result", detailItem.result],
              ["Date", new Date(detailItem.inspectedAt || detailItem.createdAt).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "var(--text-h)", fontSize: "13px" }}>{value}</span>
              </div>
            ))}
            {detailItem.notes && (
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px", marginBottom: "4px" }}>Notes</div>
                <div style={{ fontSize: "13px", color: "var(--text-h)" }}>{detailItem.notes}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={() => { setDetailItem(null); openEdit(detailItem); }} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "13px" }}>Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Inspection"
        message="Delete this quality inspection permanently?" onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)} danger />
    </PageShell>
  );
}
