import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import {
  ActionButton,
  DataRow,
  DataTable,
  KpiCard,
  SectionCard,
  StatusPill,
} from "../components/ui";
import {
  Modal, FormField,
  NativeInput as Input,
  NativeSelect as Select,
  NativeTextarea as Textarea,
  FormGrid, FormActions, ErrorBanner, ConfirmDialog,
} from "../components/ui/Modal";
import { workOrdersApi, productsApi, machinesApi } from "../api/manufacturingApi";
import type { WorkOrderRecord, ProductRecord, MachineRecord } from "../api/manufacturingApi";

// ─── Status / Priority maps ────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  planned:     "Planned",
  in_progress: "In Progress",
  on_hold:     "On Hold",
  completed:   "Completed",
  cancelled:   "Cancelled",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  planned:     "neutral",
  in_progress: "warning",
  on_hold:     "info",
  completed:   "success",
  cancelled:   "error",
};

const PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

const PRIORITY_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  critical: "error",
  high:     "error",
  medium:   "warning",
  low:      "success",
};

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "80px", height: "6px", borderRadius: "999px", background: "var(--card-border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "var(--success-text)" : "var(--accent)", borderRadius: "999px" }} />
      </div>
      <span style={{ fontSize: "11px", color: "var(--text)", minWidth: "32px" }}>{pct}%</span>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: "1px solid var(--card-border)" }}>
      <span style={{ minWidth: "140px", fontSize: "12px", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "var(--text-h)" }}>{value || "—"}</span>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface WOFormData {
  product: string;
  machine: string;
  status: string;
  priority: string;
  quantityPlanned: string;
  quantityProduced: string;
  plannedStartDate: string;
  plannedEndDate: string;
  notes: string;
}

const DEFAULT_FORM: WOFormData = {
  product: "", machine: "", status: "planned", priority: "medium",
  quantityPlanned: "", quantityProduced: "0",
  plannedStartDate: "", plannedEndDate: "", notes: "",
};

interface WOFormProps {
  initial?: WOFormData;
  products: ProductRecord[];
  machines: MachineRecord[];
  onSave: (data: WOFormData) => Promise<string | null>;
  onCancel: () => void;
  onDelete?: () => void;
  isEdit?: boolean;
}

function WorkOrderForm({ initial = DEFAULT_FORM, products, machines, onSave, onCancel, onDelete, isEdit }: WOFormProps) {
  const [form, setForm] = useState<WOFormData>(initial);
  const [errors, setErrors] = useState<Partial<WOFormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set(field: keyof WOFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<WOFormData> = {};
    if (!form.product)          e.product = "Product is required.";
    if (!form.quantityPlanned || Number(form.quantityPlanned) < 1) e.quantityPlanned = "Must be at least 1.";
    if (!form.plannedStartDate) e.plannedStartDate = "Start date is required.";
    if (!form.plannedEndDate)   e.plannedEndDate = "End date is required.";
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
          <Select value={form.product} onChange={(e) => set("product", e.target.value)} required>
            <option value="">Select product…</option>
            {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
          </Select>
        </FormField>
        <FormField label="Machine">
          <Select value={form.machine} onChange={(e) => set("machine", e.target.value)}>
            <option value="">No machine</option>
            {machines.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.machineId})</option>)}
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>
        <FormField label="Priority">
          <Select value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </FormField>
        <FormField label="Planned Qty" required error={errors.quantityPlanned}>
          <Input type="number" min="1" value={form.quantityPlanned} onChange={(e) => set("quantityPlanned", e.target.value)} placeholder="e.g. 100" />
        </FormField>
        <FormField label="Produced Qty">
          <Input type="number" min="0" value={form.quantityProduced} onChange={(e) => set("quantityProduced", e.target.value)} />
        </FormField>
        <FormField label="Start Date" required error={errors.plannedStartDate}>
          <Input type="date" value={form.plannedStartDate} onChange={(e) => set("plannedStartDate", e.target.value)} />
        </FormField>
        <FormField label="End Date" required error={errors.plannedEndDate}>
          <Input type="date" value={form.plannedEndDate} onChange={(e) => set("plannedEndDate", e.target.value)} />
        </FormField>
      </FormGrid>
      <FormField label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes…" />
      </FormField>
      <FormActions
        onCancel={onCancel}
        submitLabel={isEdit ? "Update Work Order" : "Create Work Order"}
        loading={saving}
        destructive={isEdit}
        onDestruct={onDelete}
        destructLabel="Delete Work Order"
      />
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkOrders() {
  const [records, setRecords]       = useState<WorkOrderRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [products, setProducts]     = useState<ProductRecord[]>([]);
  const [machines, setMachines]     = useState<MachineRecord[]>([]);

  // Modal state
  const [showCreate, setShowCreate]   = useState(false);
  const [editRecord, setEditRecord]   = useState<WorkOrderRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<WorkOrderRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrderRecord | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);

  // Load data
  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    const res = await workOrdersApi.list(params);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      setRecords(res.data ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  const loadSelects = useCallback(async () => {
    const [pRes, mRes] = await Promise.all([
      productsApi.list({ limit: "200" }),
      machinesApi.list({ limit: "200" }),
    ]);
    if (pRes.data) setProducts(pRes.data);
    if (mRes.data) setMachines(mRes.data);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadSelects(); }, [loadSelects]);

  // Helpers
  function getProductName(p: WorkOrderRecord["product"]): string {
    if (!p) return "—";
    if (typeof p === "object" && "name" in p) return p.name;
    return "—";
  }

  // Derived
  const filtered = records.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.workOrderNumber.toLowerCase().includes(q) ||
      getProductName(w.product).toLowerCase().includes(q)
    );
  });

  const inProgress = records.filter((w) => w.status === "in_progress").length;
  const planned    = records.filter((w) => w.status === "planned").length;
  const completed  = records.filter((w) => w.status === "completed").length;
  const critical   = records.filter((w) => w.priority === "critical").length;

  // CRUD handlers
  async function handleCreate(data: WOFormData): Promise<string | null> {
    const res = await workOrdersApi.create({
      product:           data.product,
      machine:           data.machine || undefined,
      status:            data.status,
      priority:          data.priority,
      quantityPlanned:   Number(data.quantityPlanned),
      quantityProduced:  Number(data.quantityProduced),
      plannedStartDate:  data.plannedStartDate,
      plannedEndDate:    data.plannedEndDate,
      notes:             data.notes,
    });
    if (res.error) return res.error.message;
    setShowCreate(false);
    void load();
    return null;
  }

  async function handleEdit(data: WOFormData): Promise<string | null> {
    if (!editRecord) return "No record selected.";
    const res = await workOrdersApi.update(editRecord._id, {
      product:          data.product,
      machine:          data.machine || undefined,
      status:           data.status,
      priority:         data.priority,
      quantityPlanned:  Number(data.quantityPlanned),
      quantityProduced: Number(data.quantityProduced),
      plannedStartDate: data.plannedStartDate,
      plannedEndDate:   data.plannedEndDate,
      notes:            data.notes,
    });
    if (res.error) return res.error.message;
    setEditRecord(null);
    setDetailRecord(null);
    void load();
    return null;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await workOrdersApi.delete(deleteTarget._id);
    setDeleting(false);
    if (res.error) { setApiError(res.error.message); }
    else {
      setDeleteTarget(null);
      setEditRecord(null);
      setDetailRecord(null);
      void load();
    }
  }

  function woToForm(wo: WorkOrderRecord): WOFormData {
    const productId = wo.product && typeof wo.product === "object" && "_id" in wo.product ? wo.product._id : (typeof wo.product === "string" ? wo.product : "");
    const machineId = wo.machine && typeof wo.machine === "object" && "_id" in wo.machine ? wo.machine._id : (typeof wo.machine === "string" ? wo.machine : "");
    return {
      product:          productId,
      machine:          machineId,
      status:           wo.status,
      priority:         wo.priority,
      quantityPlanned:  String(wo.quantityPlanned),
      quantityProduced: String(wo.quantityProduced),
      plannedStartDate: wo.plannedStartDate ? wo.plannedStartDate.slice(0, 10) : "",
      plannedEndDate:   wo.plannedEndDate   ? wo.plannedEndDate.slice(0, 10)   : "",
      notes:            wo.notes,
    };
  }

  return (
    <PageShell
      title="Work Orders"
      subtitle="Shop floor work orders — operations, workcenters, and execution tracking."
      action={<ActionButton label="+ New Work Order" onClick={() => setShowCreate(true)} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="In Progress" value={String(inProgress)} sub="Active on floor"   accent />
        <KpiCard label="Planned"     value={String(planned)}    sub="Ready to start"           />
        <KpiCard label="Completed"   value={String(completed)}  sub="Done"                     />
        <KpiCard label="Critical"    value={String(critical)}   sub="Needs attention"          />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search work orders…"
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
          <option value="in_progress">In Progress</option>
          <option value="on_hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {apiError && <ErrorBanner message={apiError} />}

      {/* Table */}
      <SectionCard title="Work Orders" subtitle="All shop floor work orders">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>No work orders found.</div>
        ) : (
          <DataTable columns={["WO #", "Product", "Status", "Priority", "Qty (Done/Plan)", "Progress", "Start Date", "End Date", ""]}>
            {filtered.map((wo, idx) => (
              <DataRow
                key={wo._id}
                index={idx}
                cells={[
                  <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailRecord(wo)}>{wo.workOrderNumber}</span>,
                  <span style={{ cursor: "pointer" }} onClick={() => setDetailRecord(wo)}>{getProductName(wo.product)}</span>,
                  <StatusPill label={STATUS_LABEL[wo.status] ?? wo.status} variant={STATUS_VARIANT[wo.status] ?? "neutral"} />,
                  <StatusPill label={PRIORITY_LABEL[wo.priority] ?? wo.priority} variant={PRIORITY_VARIANT[wo.priority] ?? "neutral"} />,
                  `${wo.quantityProduced} / ${wo.quantityPlanned}`,
                  <ProgressBar done={wo.quantityProduced} total={wo.quantityPlanned} />,
                  wo.plannedStartDate ? wo.plannedStartDate.slice(0, 10) : "—",
                  wo.plannedEndDate   ? wo.plannedEndDate.slice(0, 10)   : "—",
                  <button
                    onClick={() => setEditRecord(wo)}
                    style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "5px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "var(--text)" }}
                  >Edit</button>,
                ]}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Create modal */}
      <Modal open={showCreate} title="New Work Order" onClose={() => setShowCreate(false)} width={620}>
        <WorkOrderForm
          products={products}
          machines={machines}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editRecord} title={`Edit Work Order — ${editRecord?.workOrderNumber ?? ""}`} onClose={() => setEditRecord(null)} width={620}>
        {editRecord && (
          <WorkOrderForm
            initial={woToForm(editRecord)}
            products={products}
            machines={machines}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            onDelete={() => setDeleteTarget(editRecord)}
            isEdit
          />
        )}
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailRecord && !editRecord} title={`Work Order — ${detailRecord?.workOrderNumber ?? ""}`} onClose={() => setDetailRecord(null)} width={520}>
        {detailRecord && (
          <div>
            <DetailRow label="WO Number"    value={detailRecord.workOrderNumber} />
            <DetailRow label="Product"      value={getProductName(detailRecord.product)} />
            <DetailRow label="Product SKU"  value={detailRecord.product && typeof detailRecord.product === "object" && "sku" in detailRecord.product ? detailRecord.product.sku : "—"} />
            <DetailRow label="Status"       value={STATUS_LABEL[detailRecord.status] ?? detailRecord.status} />
            <DetailRow label="Priority"     value={PRIORITY_LABEL[detailRecord.priority] ?? detailRecord.priority} />
            <DetailRow label="Planned Qty"  value={String(detailRecord.quantityPlanned)} />
            <DetailRow label="Produced Qty" value={String(detailRecord.quantityProduced)} />
            <DetailRow label="Rejected Qty" value={String(detailRecord.quantityRejected)} />
            <DetailRow label="Start Date"   value={detailRecord.plannedStartDate?.slice(0, 10) ?? "—"} />
            <DetailRow label="End Date"     value={detailRecord.plannedEndDate?.slice(0, 10) ?? "—"} />
            <DetailRow label="Notes"        value={detailRecord.notes} />
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button
                onClick={() => { setEditRecord(detailRecord); setDetailRecord(null); }}
                style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: "7px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >Edit</button>
              <button
                onClick={() => setDetailRecord(null)}
                style={{ background: "var(--table-head-bg)", color: "var(--text)", border: "1px solid var(--card-border)", borderRadius: "7px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" }}
              >Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Work Order"
        message={`Are you sure you want to delete work order ${deleteTarget?.workOrderNumber}? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </PageShell>
  );
}
