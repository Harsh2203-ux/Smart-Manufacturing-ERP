import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, NativeInput as Input, NativeSelect as Select, NativeTextarea as Textarea, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { planningApi, productsApi } from "../api/manufacturingApi";
import type { ProductionPlanRecord, ProductRecord } from "../api/manufacturingApi";

const STATUS_LABEL: Record<string, string> = {
  planned: "Planned", released: "Released",
  partially_done: "Partially Done", completed: "Completed", cancelled: "Cancelled",
};
const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  planned: "neutral", released: "info", partially_done: "warning", completed: "success", cancelled: "error",
};
const PRIORITY_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  high: "error", medium: "warning", low: "success",
};
const SOURCE_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  mrp: "info", manual: "neutral", sales_order: "success", forecast: "warning",
};

function FillBar({ confirmed, planned }: { confirmed: number; planned: number }) {
  const pct = planned === 0 ? 0 : Math.round((confirmed / planned) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "80px", height: "6px", borderRadius: "999px", background: "var(--card-border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "var(--success-text)" : "var(--accent)", borderRadius: "999px" }} />
      </div>
      <span style={{ fontSize: "11px", color: "var(--text)", minWidth: "32px" }}>{confirmed}/{planned}</span>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface PlanFormData {
  product: string; plannedQty: string; confirmedQty: string;
  startDate: string; endDate: string;
  productionLine: string; planner: string;
  status: string; priority: string; source: string; notes: string;
}

const DEFAULT_FORM: PlanFormData = {
  product: "", plannedQty: "", confirmedQty: "0",
  startDate: "", endDate: "",
  productionLine: "", planner: "",
  status: "planned", priority: "medium", source: "manual", notes: "",
};

function PlanForm({
  initial = DEFAULT_FORM, products, onSave, onCancel, onDelete, isEdit,
}: {
  initial?: PlanFormData; products: ProductRecord[];
  onSave: (d: PlanFormData) => Promise<string | null>;
  onCancel: () => void; onDelete?: () => void; isEdit?: boolean;
}) {
  const [form, setForm] = useState<PlanFormData>(initial);
  const [errors, setErrors] = useState<Partial<PlanFormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set(field: keyof PlanFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<PlanFormData> = {};
    if (!form.product) e.product = "Product is required.";
    if (!form.plannedQty || Number(form.plannedQty) < 1) e.plannedQty = "Must be at least 1.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.endDate)   e.endDate = "End date is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    const err = await onSave(form);
    if (err) setApiError(err);
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {apiError && <ErrorBanner message={apiError} />}
      <FormGrid>
        <FormField label="Product" required error={errors.product}>
          <Select value={form.product} onChange={(e) => set("product", e.target.value)}>
            <option value="">Select product…</option>
            {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
          </Select>
        </FormField>
        <FormField label="Source">
          <Select value={form.source} onChange={(e) => set("source", e.target.value)}>
            <option value="manual">Manual</option>
            <option value="mrp">MRP</option>
            <option value="sales_order">Sales Order</option>
            <option value="forecast">Forecast</option>
          </Select>
        </FormField>
        <FormField label="Planned Qty" required error={errors.plannedQty}>
          <Input type="number" min="1" value={form.plannedQty} onChange={(e) => set("plannedQty", e.target.value)} />
        </FormField>
        <FormField label="Confirmed Qty">
          <Input type="number" min="0" value={form.confirmedQty} onChange={(e) => set("confirmedQty", e.target.value)} />
        </FormField>
        <FormField label="Start Date" required error={errors.startDate}>
          <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </FormField>
        <FormField label="End Date" required error={errors.endDate}>
          <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="planned">Planned</option>
            <option value="released">Released</option>
            <option value="partially_done">Partially Done</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>
        <FormField label="Priority">
          <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </FormField>
        <FormField label="Production Line">
          <Input value={form.productionLine} onChange={(e) => set("productionLine", e.target.value)} placeholder="e.g. Line 3" />
        </FormField>
        <FormField label="Planner">
          <Input value={form.planner} onChange={(e) => set("planner", e.target.value)} placeholder="e.g. L. Chen" />
        </FormField>
      </FormGrid>
      <FormField label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </FormField>
      <FormActions
        onCancel={onCancel}
        submitLabel={isEdit ? "Update Plan" : "Create Plan"}
        loading={saving}
        destructive={isEdit}
        onDestruct={onDelete}
        destructLabel="Delete Plan"
      />
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductionPlanning() {
  const [records, setRecords]   = useState<ProductionPlanRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<ProductionPlanRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionPlanRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const params: Record<string, string> = { limit: "200" };
    if (statusFilter) params.status = statusFilter;
    const res = await planningApi.list(params);
    if (res.error) setApiError(res.error.message);
    else setRecords(res.data ?? []);
    setLoading(false);
  }, [statusFilter]);

  const loadProducts = useCallback(async () => {
    const res = await productsApi.list({ limit: "200" });
    if (res.data) setProducts(res.data);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadProducts(); }, [loadProducts]);

  function getPlanProductName(prod: ProductionPlanRecord["product"]): string {
    if (!prod) return "—";
    if (typeof prod === "object" && "name" in prod) return prod.name;
    return "—";
  }
  function getPlanProductSku(prod: ProductionPlanRecord["product"]): string {
    if (!prod) return "—";
    if (typeof prod === "object" && "sku" in prod) return prod.sku;
    return "—";
  }

  const filtered = records.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getPlanProductName(p.product).toLowerCase().includes(q) || getPlanProductSku(p.product).toLowerCase().includes(q);
  });

  const planned       = records.filter((p) => p.status === "planned").length;
  const released      = records.filter((p) => p.status === "released").length;
  const completed     = records.filter((p) => p.status === "completed").length;
  const totalPlannedQty = records.reduce((acc, p) => acc + p.plannedQty, 0);

  async function handleCreate(data: PlanFormData): Promise<string | null> {
    const res = await planningApi.create({
      product: data.product,
      plannedQty: Number(data.plannedQty), confirmedQty: Number(data.confirmedQty),
      startDate: data.startDate, endDate: data.endDate,
      productionLine: data.productionLine, planner: data.planner,
      status: data.status, priority: data.priority, source: data.source, notes: data.notes,
    });
    if (res.error) return res.error.message;
    setShowCreate(false);
    void load();
    return null;
  }

  async function handleEdit(data: PlanFormData): Promise<string | null> {
    if (!editRecord) return "No record.";
    const res = await planningApi.update(editRecord._id, {
      product: data.product,
      plannedQty: Number(data.plannedQty), confirmedQty: Number(data.confirmedQty),
      startDate: data.startDate, endDate: data.endDate,
      productionLine: data.productionLine, planner: data.planner,
      status: data.status, priority: data.priority, source: data.source, notes: data.notes,
    });
    if (res.error) return res.error.message;
    setEditRecord(null);
    void load();
    return null;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await planningApi.delete(deleteTarget._id);
    setDeleting(false);
    if (res.error) setApiError(res.error.message);
    else { setDeleteTarget(null); setEditRecord(null); void load(); }
  }

  function toForm(p: ProductionPlanRecord): PlanFormData {
    const productId = p.product && typeof p.product === "object" && "_id" in p.product ? p.product._id : (typeof p.product === "string" ? p.product : "");
    return {
      product:        productId,
      plannedQty:     String(p.plannedQty), confirmedQty: String(p.confirmedQty),
      startDate:      p.startDate?.slice(0, 10) ?? "",
      endDate:        p.endDate?.slice(0, 10) ?? "",
      productionLine: p.productionLine, planner: p.planner,
      status: p.status, priority: p.priority, source: p.source, notes: p.notes,
    };
  }

  return (
    <PageShell
      title="Production Planning"
      subtitle="MRP-driven production plans, schedules, and capacity allocation."
      action={<ActionButton label="+ New Plan" onClick={() => setShowCreate(true)} />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Planned Orders"    value={String(planned)}              sub="Awaiting release" accent />
        <KpiCard label="Released"          value={String(released)}             sub="On schedule"            />
        <KpiCard label="Completed"         value={String(completed)}            sub="This period"            />
        <KpiCard label="Total Planned Qty" value={totalPlannedQty.toLocaleString()} sub="Units this cycle"    />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search plans…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)", minWidth: "220px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)" }}
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="released">Released</option>
          <option value="partially_done">Partially Done</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {apiError && <ErrorBanner message={apiError} />}

      <SectionCard title="Production Plans" subtitle="All production planning orders">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>No production plans found.</div>
        ) : (
          <DataTable columns={["Plan ID", "Product", "SKU", "Source", "Planned Qty", "Progress", "Start Date", "End Date", "Line", "Priority", "Status", ""]}>
            {filtered.map((plan, idx) => (
              <DataRow
                key={plan._id}
                index={idx}
                cells={[
                  <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)" }}>{plan.planNumber}</span>,
                  getPlanProductName(plan.product),
                  <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{getPlanProductSku(plan.product)}</span>,
                  <StatusPill label={plan.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} variant={SOURCE_VARIANT[plan.source] ?? "neutral"} />,
                  plan.plannedQty.toLocaleString(),
                  <FillBar confirmed={plan.confirmedQty} planned={plan.plannedQty} />,
                  plan.startDate?.slice(0, 10) ?? "—",
                  plan.endDate?.slice(0, 10) ?? "—",
                  plan.productionLine || "—",
                  <StatusPill label={plan.priority.charAt(0).toUpperCase() + plan.priority.slice(1)} variant={PRIORITY_VARIANT[plan.priority] ?? "neutral"} />,
                  <StatusPill label={STATUS_LABEL[plan.status] ?? plan.status} variant={STATUS_VARIANT[plan.status] ?? "neutral"} />,
                  <button
                    onClick={() => setEditRecord(plan)}
                    style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "5px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "var(--text)" }}
                  >Edit</button>,
                ]}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      <Modal open={showCreate} title="New Production Plan" onClose={() => setShowCreate(false)} width={640}>
        <PlanForm products={products} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={!!editRecord} title={`Edit Plan — ${editRecord?.planNumber ?? ""}`} onClose={() => setEditRecord(null)} width={640}>
        {editRecord && (
          <PlanForm
            initial={toForm(editRecord)}
            products={products}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            onDelete={() => setDeleteTarget(editRecord)}
            isEdit
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Production Plan"
        message={`Delete plan ${deleteTarget?.planNumber}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </PageShell>
  );
}
