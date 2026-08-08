import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import {
  Modal, FormField,
  NativeInput as Input,
  NativeSelect as Select,
  FormGrid, FormActions, ErrorBanner,
} from "../components/ui/Modal";
import { inventoryApi, productsApi } from "../api/manufacturingApi";
import type { InventoryItem, ProductRecord } from "../api/manufacturingApi";

function getStockStatus(item: InventoryItem): { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" } {
  const reorder = item.product?.reorderPoint ?? 0;
  if (item.quantity === 0) return { label: "Out of Stock", variant: "error" };
  if (item.availableQty <= reorder) return { label: "Low Stock", variant: "warning" };
  return { label: "In Stock", variant: "success" };
}

// ─── Stock Adjust Form ────────────────────────────────────────────────────────

interface AdjustFormData {
  productId: string; warehouse: string; quantity: string;
  type: string; reference: string; notes: string;
}

const DEFAULT_ADJ: AdjustFormData = {
  productId: "", warehouse: "Main Warehouse", quantity: "",
  type: "receipt", reference: "", notes: "",
};

function AdjustForm({
  initial = DEFAULT_ADJ, products, onSave, onCancel,
}: {
  initial?: AdjustFormData;
  products: ProductRecord[];
  onSave: (d: AdjustFormData) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AdjustFormData>(initial);
  const [errors, setErrors] = useState<Partial<AdjustFormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set(field: keyof AdjustFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<AdjustFormData> = {};
    if (!form.productId)                            e.productId = "Product is required.";
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = "Quantity must be > 0.";
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
        <FormField label="Product" required error={errors.productId}>
          <Select value={form.productId} onChange={(e) => set("productId", e.target.value)}>
            <option value="">Select product…</option>
            {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
          </Select>
        </FormField>
        <FormField label="Warehouse">
          <Input value={form.warehouse} onChange={(e) => set("warehouse", e.target.value)} />
        </FormField>
        <FormField label="Quantity" required error={errors.quantity}>
          <Input type="number" min="0.001" step="any" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="e.g. 100" />
        </FormField>
        <FormField label="Transaction Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="receipt">Receipt (Incoming)</option>
            <option value="issue">Issue (Outgoing)</option>
            <option value="adjustment">Adjustment</option>
            <option value="return">Return</option>
            <option value="scrap">Scrap</option>
            <option value="transfer">Transfer</option>
          </Select>
        </FormField>
        <FormField label="Reference">
          <Input value={form.reference} onChange={(e) => set("reference", e.target.value)} placeholder="e.g. PO-1234" />
        </FormField>
        <FormField label="Notes">
          <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional…" />
        </FormField>
      </FormGrid>
      <FormActions onCancel={onCancel} submitLabel="Adjust Stock" loading={saving} />
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Inventory() {
  const [records, setRecords]   = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [warehouseFilter, setWhFilter] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustInitial, setAdjustInitial] = useState<AdjustFormData>(DEFAULT_ADJ);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const params: Record<string, string> = { limit: "200" };
    if (warehouseFilter) params.warehouse = warehouseFilter;
    const res = await inventoryApi.list(params);
    if (res.error) setApiError(res.error.message);
    else setRecords(res.data ?? []);
    setLoading(false);
  }, [warehouseFilter]);

  const loadProducts = useCallback(async () => {
    const res = await productsApi.list({ limit: "200" });
    if (res.data) setProducts(res.data);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const filtered = records.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (item.product?.name ?? "").toLowerCase().includes(q) ||
      (item.product?.sku ?? "").toLowerCase().includes(q) ||
      item.warehouse.toLowerCase().includes(q)
    );
  });

  const total    = records.length;
  const inStock  = records.filter((i) => getStockStatus(i).label === "In Stock").length;
  const low      = records.filter((i) => getStockStatus(i).label === "Low Stock").length;
  const out      = records.filter((i) => getStockStatus(i).label === "Out of Stock").length;

  async function handleAdjust(data: AdjustFormData): Promise<string | null> {
    const res = await inventoryApi.adjust({
      productId:  data.productId,
      warehouse:  data.warehouse,
      quantity:   Number(data.quantity),
      type:       data.type as "receipt" | "issue" | "adjustment" | "transfer" | "return" | "scrap",
      reference:  data.reference,
      notes:      data.notes,
    });
    if (res.error) return res.error.message;
    setShowAdjust(false);
    void load();
    return null;
  }

  function openAdjustFor(item: InventoryItem) {
    setAdjustInitial({
      ...DEFAULT_ADJ,
      productId: item.product?._id ?? "",
      warehouse: item.warehouse,
    });
    setShowAdjust(true);
  }

  return (
    <PageShell
      title="Inventory"
      subtitle="Real-time stock levels, SKUs, and warehouse locations."
      action={<ActionButton label="+ Adjust Stock" onClick={() => { setAdjustInitial(DEFAULT_ADJ); setShowAdjust(true); }} />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Total SKUs"   value={String(total)}   sub="Tracked items"          accent />
        <KpiCard label="In Stock"     value={String(inStock)} sub="Healthy levels"                />
        <KpiCard label="Low Stock"    value={String(low)}     sub="Below reorder point"           />
        <KpiCard label="Out of Stock" value={String(out)}     sub="Requires immediate action"     />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search inventory…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)", minWidth: "220px" }}
        />
        <input
          placeholder="Filter by warehouse…"
          value={warehouseFilter}
          onChange={(e) => setWhFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)", minWidth: "180px" }}
        />
      </div>

      {apiError && <ErrorBanner message={apiError} />}

      <SectionCard title="Stock Levels" subtitle="All warehouse SKUs">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>No inventory records found.</div>
        ) : (
          <DataTable columns={["SKU", "Name", "Warehouse", "On Hand", "Reserved", "Available", "Reorder Pt.", "Unit", "Status", ""]}>
            {filtered.map((item, idx) => {
              const { label, variant } = getStockStatus(item);
              return (
                <DataRow
                  key={item._id}
                  index={idx}
                  cells={[
                    <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)" }}>{item.product?.sku ?? "—"}</span>,
                    item.product?.name ?? "—",
                    item.warehouse,
                    item.quantity.toLocaleString(),
                    item.reservedQty.toLocaleString(),
                    item.availableQty.toLocaleString(),
                    (item.product?.reorderPoint ?? 0).toLocaleString(),
                    item.unit,
                    <StatusPill label={label} variant={variant} />,
                    <button
                      onClick={() => openAdjustFor(item)}
                      style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "5px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "var(--text)" }}
                    >Adjust</button>,
                  ]}
                />
              );
            })}
          </DataTable>
        )}
      </SectionCard>

      <Modal open={showAdjust} title="Stock Adjustment" onClose={() => setShowAdjust(false)} width={580}>
        <AdjustForm
          initial={adjustInitial}
          products={products}
          onSave={handleAdjust}
          onCancel={() => setShowAdjust(false)}
        />
      </Modal>
    </PageShell>
  );
}
