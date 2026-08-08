import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import {
  ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill,
} from "../components/ui";
import {
  Modal, FormField,
  NativeInput as Input,
  NativeSelect as Select,
  NativeTextarea as Textarea,
  FormGrid, FormActions, ErrorBanner, ConfirmDialog,
} from "../components/ui/Modal";
import { productsApi } from "../api/manufacturingApi";
import type { ProductRecord } from "../api/manufacturingApi";

// ─── Form ─────────────────────────────────────────────────────────────────────

interface ProductFormData {
  sku: string; name: string; description: string;
  category: string; unit: string;
  costPrice: string; sellingPrice: string;
  reorderPoint: string; leadTimeDays: string;
  isActive: string; isRawMaterial: string;
  notes: string;
}

const DEFAULT_FORM: ProductFormData = {
  sku: "", name: "", description: "",
  category: "", unit: "pcs",
  costPrice: "0", sellingPrice: "0",
  reorderPoint: "0", leadTimeDays: "0",
  isActive: "true", isRawMaterial: "false",
  notes: "",
};

function ProductForm({
  initial = DEFAULT_FORM, onSave, onCancel, onDelete, isEdit,
}: {
  initial?: ProductFormData;
  onSave: (d: ProductFormData) => Promise<string | null>;
  onCancel: () => void;
  onDelete?: () => void;
  isEdit?: boolean;
}) {
  const [form, setForm] = useState<ProductFormData>(initial);
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set(field: keyof ProductFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<ProductFormData> = {};
    if (!form.name.trim())     e.name = "Name is required.";
    if (!form.category.trim()) e.category = "Category is required.";
    if (Number(form.costPrice) < 0) e.costPrice = "Must be ≥ 0.";
    if (Number(form.sellingPrice) < 0) e.sellingPrice = "Must be ≥ 0.";
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
        <FormField label="Product Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Control Panel A-7" />
        </FormField>
        <FormField label="SKU">
          <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Auto-generated if empty" />
        </FormField>
        <FormField label="Category" required error={errors.category}>
          <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Electronics" />
        </FormField>
        <FormField label="Unit of Measure">
          <Select value={form.unit} onChange={(e) => set("unit", e.target.value)}>
            <option value="pcs">pcs</option>
            <option value="kg">kg</option>
            <option value="ltr">ltr</option>
            <option value="m">m</option>
            <option value="m2">m²</option>
            <option value="set">set</option>
          </Select>
        </FormField>
        <FormField label="Cost Price" error={errors.costPrice}>
          <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
        </FormField>
        <FormField label="Selling Price" error={errors.sellingPrice}>
          <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} />
        </FormField>
        <FormField label="Reorder Point">
          <Input type="number" min="0" value={form.reorderPoint} onChange={(e) => set("reorderPoint", e.target.value)} />
        </FormField>
        <FormField label="Lead Time (days)">
          <Input type="number" min="0" value={form.leadTimeDays} onChange={(e) => set("leadTimeDays", e.target.value)} />
        </FormField>
        <FormField label="Status">
          <Select value={form.isActive} onChange={(e) => set("isActive", e.target.value)}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </FormField>
        <FormField label="Type">
          <Select value={form.isRawMaterial} onChange={(e) => set("isRawMaterial", e.target.value)}>
            <option value="false">Finished / WIP / Consumable</option>
            <option value="true">Raw Material</option>
          </Select>
        </FormField>
      </FormGrid>
      <FormField label="Description">
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional product description…" />
      </FormField>
      <FormField label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes…" />
      </FormField>
      <FormActions
        onCancel={onCancel}
        submitLabel={isEdit ? "Update Product" : "Create Product"}
        loading={saving}
        destructive={isEdit}
        onDestruct={onDelete}
        destructLabel="Delete Product"
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

export default function Products() {
  const [records, setRecords]     = useState<ProductRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<ProductRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<ProductRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductRecord | null>(null);
  const [deleting, setDeleting]   = useState(false);
  const [apiError, setApiError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const params: Record<string, string> = { limit: "200" };
    if (catFilter) params.category = catFilter;
    if (search)    params.search   = search;
    const res = await productsApi.list(params);
    if (res.error) setApiError(res.error.message);
    else setRecords(res.data ?? []);
    setLoading(false);
  }, [catFilter, search]);

  const loadCategories = useCallback(async () => {
    const res = await productsApi.categories();
    if (res.data && Array.isArray(res.data)) setCategories(res.data as string[]);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadCategories(); }, [loadCategories]);

  const active       = records.filter((p) => p.isActive).length;
  const outOfStock   = 0; // stock info comes from inventory
  const belowReorder = 0;
  const totalSkus    = records.length;

  async function handleCreate(data: ProductFormData): Promise<string | null> {
    const res = await productsApi.create({
      name:          data.name.trim(),
      sku:           data.sku.trim() || undefined,
      description:   data.description,
      category:      data.category.trim(),
      unit:          data.unit,
      costPrice:     Number(data.costPrice),
      sellingPrice:  Number(data.sellingPrice),
      reorderPoint:  Number(data.reorderPoint),
      leadTimeDays:  Number(data.leadTimeDays),
      isActive:      data.isActive === "true",
      isRawMaterial: data.isRawMaterial === "true",
      notes:         data.notes,
    });
    if (res.error) return res.error.message;
    setShowCreate(false);
    void load();
    void loadCategories();
    return null;
  }

  async function handleEdit(data: ProductFormData): Promise<string | null> {
    if (!editRecord) return "No record selected.";
    const res = await productsApi.update(editRecord._id, {
      name:          data.name.trim(),
      sku:           data.sku.trim() || undefined,
      description:   data.description,
      category:      data.category.trim(),
      unit:          data.unit,
      costPrice:     Number(data.costPrice),
      sellingPrice:  Number(data.sellingPrice),
      reorderPoint:  Number(data.reorderPoint),
      leadTimeDays:  Number(data.leadTimeDays),
      isActive:      data.isActive === "true",
      isRawMaterial: data.isRawMaterial === "true",
      notes:         data.notes,
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
    const res = await productsApi.delete(deleteTarget._id);
    setDeleting(false);
    if (res.error) setApiError(res.error.message);
    else { setDeleteTarget(null); setEditRecord(null); setDetailRecord(null); void load(); }
  }

  function toForm(p: ProductRecord): ProductFormData {
    return {
      sku:           p.sku,
      name:          p.name,
      description:   p.description,
      category:      p.category,
      unit:          p.unit,
      costPrice:     String(p.costPrice),
      sellingPrice:  String(p.sellingPrice),
      reorderPoint:  String(p.reorderPoint),
      leadTimeDays:  String(p.leadTimeDays),
      isActive:      String(p.isActive),
      isRawMaterial: String(p.isRawMaterial),
      notes:         p.notes,
    };
  }

  return (
    <PageShell
      title="Products"
      subtitle="Product catalogue — SKUs, pricing, stock levels, and supplier mapping."
      action={<ActionButton label="+ Add Product" onClick={() => setShowCreate(true)} />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Active Products" value={String(active)}     sub="In catalogue"       accent />
        <KpiCard label="Total SKUs"      value={String(totalSkus)}  sub="All product types"        />
        <KpiCard label="Out of Stock"    value={String(outOfStock)}  sub="Need replenishment"       />
        <KpiCard label="Below Reorder"   value={String(belowReorder)} sub="Low stock alert"         />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)", minWidth: "220px" }}
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)" }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {apiError && <ErrorBanner message={apiError} />}

      <SectionCard title="Product Catalogue" subtitle="All products and materials">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>No products found.</div>
        ) : (
          <DataTable columns={["SKU", "Name", "Category", "Unit", "Cost", "Sale Price", "Reorder Pt.", "Lead Time", "Status", ""]}>
            {records.map((p, idx) => (
              <DataRow
                key={p._id}
                index={idx}
                cells={[
                  <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailRecord(p)}>{p.sku}</span>,
                  <span style={{ cursor: "pointer" }} onClick={() => setDetailRecord(p)}>{p.name}</span>,
                  p.category,
                  p.unit,
                  p.costPrice > 0 ? `$${p.costPrice.toFixed(2)}` : "—",
                  p.sellingPrice > 0 ? `$${p.sellingPrice.toFixed(2)}` : "—",
                  String(p.reorderPoint),
                  `${p.leadTimeDays}d`,
                  <StatusPill label={p.isActive ? "Active" : "Inactive"} variant={p.isActive ? "success" : "neutral"} />,
                  <button
                    onClick={() => setEditRecord(p)}
                    style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "5px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "var(--text)" }}
                  >Edit</button>,
                ]}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      {/* Create */}
      <Modal open={showCreate} title="New Product" onClose={() => setShowCreate(false)} width={640}>
        <ProductForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      {/* Edit */}
      <Modal open={!!editRecord} title={`Edit Product — ${editRecord?.name ?? ""}`} onClose={() => setEditRecord(null)} width={640}>
        {editRecord && (
          <ProductForm
            initial={toForm(editRecord)}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            onDelete={() => setDeleteTarget(editRecord)}
            isEdit
          />
        )}
      </Modal>

      {/* Detail */}
      <Modal open={!!detailRecord && !editRecord} title={detailRecord?.name ?? ""} onClose={() => setDetailRecord(null)} width={500}>
        {detailRecord && (
          <div>
            <DR label="SKU"          value={detailRecord.sku} />
            <DR label="Name"         value={detailRecord.name} />
            <DR label="Category"     value={detailRecord.category} />
            <DR label="Unit"         value={detailRecord.unit} />
            <DR label="Cost Price"   value={detailRecord.costPrice > 0 ? `$${detailRecord.costPrice.toFixed(2)}` : "—"} />
            <DR label="Sale Price"   value={detailRecord.sellingPrice > 0 ? `$${detailRecord.sellingPrice.toFixed(2)}` : "—"} />
            <DR label="Reorder Pt."  value={String(detailRecord.reorderPoint)} />
            <DR label="Lead Time"    value={`${detailRecord.leadTimeDays} days`} />
            <DR label="Type"         value={detailRecord.isRawMaterial ? "Raw Material" : "Finished / Other"} />
            <DR label="Status"       value={detailRecord.isActive ? "Active" : "Inactive"} />
            <DR label="Description"  value={detailRecord.description} />
            <DR label="Notes"        value={detailRecord.notes} />
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
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </PageShell>
  );
}
