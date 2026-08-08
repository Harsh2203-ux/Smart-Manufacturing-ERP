import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, NativeInput as Input, NativeSelect as Select, NativeTextarea as Textarea, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { bomApi, productsApi } from "../api/manufacturingApi";
import type { BOMRecord, ProductRecord } from "../api/manufacturingApi";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", active: "Active", under_review: "Under Review", obsolete: "Obsolete",
};
const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  active: "success", draft: "neutral", under_review: "warning", obsolete: "error",
};
const TYPE_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  manufacture: "info", phantom: "neutral", kit: "warning", subcontract: "error",
};

// ─── Form ─────────────────────────────────────────────────────────────────────

interface BOMFormData {
  product: string; version: string; type: string; status: string;
  totalCost: string; notes: string;
}

const DEFAULT_FORM: BOMFormData = {
  product: "", version: "v1.0", type: "manufacture", status: "draft",
  totalCost: "0", notes: "",
};

function BOMForm({
  initial = DEFAULT_FORM, products, onSave, onCancel, onDelete, isEdit,
}: {
  initial?: BOMFormData; products: ProductRecord[];
  onSave: (d: BOMFormData) => Promise<string | null>;
  onCancel: () => void; onDelete?: () => void; isEdit?: boolean;
}) {
  const [form, setForm] = useState<BOMFormData>(initial);
  const [errors, setErrors] = useState<Partial<BOMFormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set(field: keyof BOMFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<BOMFormData> = {};
    if (!form.product) e.product = "Product is required.";
    if (!form.version.trim()) e.version = "Version is required.";
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
        <FormField label="Version" required error={errors.version}>
          <Input value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="e.g. v1.0" />
        </FormField>
        <FormField label="BOM Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="manufacture">Manufacture</option>
            <option value="phantom">Phantom</option>
            <option value="kit">Kit</option>
            <option value="subcontract">Subcontract</option>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="under_review">Under Review</option>
            <option value="obsolete">Obsolete</option>
          </Select>
        </FormField>
        <FormField label="Total Cost ($)">
          <Input type="number" min="0" step="0.01" value={form.totalCost} onChange={(e) => set("totalCost", e.target.value)} />
        </FormField>
      </FormGrid>
      <FormField label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </FormField>
      <FormActions
        onCancel={onCancel}
        submitLabel={isEdit ? "Update BOM" : "Create BOM"}
        loading={saving}
        destructive={isEdit}
        onDestruct={onDelete}
        destructLabel="Delete BOM"
      />
    </form>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

function DR({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: "1px solid var(--card-border)" }}>
      <span style={{ minWidth: "140px", fontSize: "12px", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "var(--text-h)" }}>{value || "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillOfMaterials() {
  const [records, setRecords]   = useState<BOMRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<BOMRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<BOMRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BOMRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const params: Record<string, string> = { limit: "200" };
    if (statusFilter) params.status = statusFilter;
    const res = await bomApi.list(params);
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

  function getBOMProductName(prod: BOMRecord["product"]): string {
    if (!prod) return "—";
    if (typeof prod === "object" && "name" in prod) return prod.name;
    return "—";
  }
  function getBOMProductSku(prod: BOMRecord["product"]): string {
    if (!prod) return "—";
    if (typeof prod === "object" && "sku" in prod) return prod.sku;
    return "—";
  }

  const filtered = records.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getBOMProductName(b.product).toLowerCase().includes(q) || getBOMProductSku(b.product).toLowerCase().includes(q);
  });

  const active      = records.filter((b) => b.status === "active").length;
  const draft       = records.filter((b) => b.status === "draft").length;
  const underReview = records.filter((b) => b.status === "under_review").length;
  const totalComponents = records.reduce((acc, b) => acc + b.components.length, 0);

  async function handleCreate(data: BOMFormData): Promise<string | null> {
    const res = await bomApi.create({
      product: data.product, version: data.version.trim(),
      type: data.type, status: data.status,
      totalCost: Number(data.totalCost), notes: data.notes,
    });
    if (res.error) return res.error.message;
    setShowCreate(false);
    void load();
    return null;
  }

  async function handleEdit(data: BOMFormData): Promise<string | null> {
    if (!editRecord) return "No record.";
    const res = await bomApi.update(editRecord._id, {
      product: data.product, version: data.version.trim(),
      type: data.type, status: data.status,
      totalCost: Number(data.totalCost), notes: data.notes,
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
    const res = await bomApi.delete(deleteTarget._id);
    setDeleting(false);
    if (res.error) setApiError(res.error.message);
    else { setDeleteTarget(null); setEditRecord(null); setDetailRecord(null); void load(); }
  }

  function toForm(b: BOMRecord): BOMFormData {
    const productId = b.product && typeof b.product === "object" && "_id" in b.product ? b.product._id : (typeof b.product === "string" ? b.product : "");
    return {
      product:   productId,
      version:   b.version, type: b.type, status: b.status,
      totalCost: String(b.totalCost), notes: b.notes,
    };
  }

  return (
    <PageShell
      title="Bill of Materials"
      subtitle="Product BOM definitions — components, versions, and cost structures."
      action={<ActionButton label="+ New BOM" onClick={() => setShowCreate(true)} />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Active BOMs"       value={String(active)}          sub="In production use"  accent />
        <KpiCard label="Draft"             value={String(draft)}           sub="Pending activation"       />
        <KpiCard label="Under Review"      value={String(underReview)}     sub="Awaiting approval"        />
        <KpiCard label="Total Components"  value={String(totalComponents)} sub="Across all BOMs"          />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search BOMs…"
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
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="under_review">Under Review</option>
          <option value="obsolete">Obsolete</option>
        </select>
      </div>

      {apiError && <ErrorBanner message={apiError} />}

      <SectionCard title="Bill of Materials" subtitle="All product BOM records">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>No BOMs found.</div>
        ) : (
          <DataTable columns={["Product", "SKU", "Version", "Type", "Components", "Total Cost", "Status", ""]}>
            {filtered.map((b, idx) => (
              <DataRow
                key={b._id}
                index={idx}
                cells={[
                  <span style={{ cursor: "pointer" }} onClick={() => setDetailRecord(b)}>{getBOMProductName(b.product)}</span>,
                  <span style={{ fontFamily: "monospace", fontSize: "12px", cursor: "pointer" }} onClick={() => setDetailRecord(b)}>{getBOMProductSku(b.product)}</span>,
                  <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{b.version}</span>,
                  <StatusPill label={b.type.charAt(0).toUpperCase() + b.type.slice(1)} variant={TYPE_VARIANT[b.type] ?? "neutral"} />,
                  String(b.components.length),
                  `$${b.totalCost.toFixed(2)}`,
                  <StatusPill label={STATUS_LABEL[b.status] ?? b.status} variant={STATUS_VARIANT[b.status] ?? "neutral"} />,
                  <button
                    onClick={() => setEditRecord(b)}
                    style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "5px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "var(--text)" }}
                  >Edit</button>,
                ]}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      <Modal open={showCreate} title="New BOM" onClose={() => setShowCreate(false)} width={580}>
        <BOMForm products={products} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={!!editRecord} title={`Edit BOM — ${getBOMProductName(editRecord?.product ?? null)}`} onClose={() => setEditRecord(null)} width={580}>
        {editRecord && (
          <BOMForm
            initial={toForm(editRecord)}
            products={products}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            onDelete={() => setDeleteTarget(editRecord)}
            isEdit
          />
        )}
      </Modal>

      <Modal open={!!detailRecord && !editRecord} title={`BOM — ${getBOMProductName(detailRecord?.product ?? null)}`} onClose={() => setDetailRecord(null)} width={500}>
        {detailRecord && (
          <div>
            <DR label="Product"     value={getBOMProductName(detailRecord.product)} />
            <DR label="SKU"         value={getBOMProductSku(detailRecord.product)} />
            <DR label="Version"     value={detailRecord.version} />
            <DR label="Type"        value={detailRecord.type} />
            <DR label="Status"      value={STATUS_LABEL[detailRecord.status] ?? detailRecord.status} />
            <DR label="Components"  value={String(detailRecord.components.length)} />
            <DR label="Total Cost"  value={`$${detailRecord.totalCost.toFixed(2)}`} />
            <DR label="Notes"       value={detailRecord.notes} />
            {detailRecord.components.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "8px" }}>Components</div>
                {detailRecord.components.map((c) => (
                  <div key={c._id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--card-border)", fontSize: "13px" }}>
                    <span>{c.product?.name ?? "—"} <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--text)" }}>({c.product?.sku ?? "—"})</span></span>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{c.quantity} {c.unit}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "20px" }}>
              <button onClick={() => { setEditRecord(detailRecord); setDetailRecord(null); }}
                style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: "7px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Edit</button>
              <button onClick={() => setDetailRecord(null)}
                style={{ background: "var(--table-head-bg)", color: "var(--text)", border: "1px solid var(--card-border)", borderRadius: "7px", padding: "8px 16px", fontSize: "13px", cursor: "pointer" }}>Close</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete BOM"
        message={`Delete BOM for "${getBOMProductName(deleteTarget?.product ?? null)}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </PageShell>
  );
}
