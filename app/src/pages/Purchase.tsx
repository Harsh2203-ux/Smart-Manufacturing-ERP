import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, Input, Select, Textarea, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { ordersApi, suppliersApi, type OrderRecord } from "../api/businessApi";
import { productsApi, type ProductRecord } from "../api/manufacturingApi";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalSupplier { _id: string; name: string; code: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AED"];
const STATUSES = ["draft", "pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending: "Pending Approval", confirmed: "Confirmed",
  in_production: "In Production", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  draft: "neutral", pending: "warning", confirmed: "info",
  in_production: "info", shipped: "warning", delivered: "success", cancelled: "error",
};

// ── Helper ────────────────────────────────────────────────────────────────────

function getSupplierName(s: OrderRecord["supplier"]): string {
  if (!s) return "—";
  if (typeof s === "string") return s;
  return s.name;
}

function blank() {
  return {
    type: "purchase" as const,
    status: "draft",
    currency: "USD",
    orderDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    supplier: "",
    notes: "",
    items: [] as Array<{ product: string; name: string; sku: string; quantity: number; unitPrice: number }>,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Purchase() {
  const [orders, setOrders]         = useState<OrderRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<OrderRecord | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<OrderRecord | null>(null);
  const [form, setForm]             = useState(blank());
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [suppliers, setSuppliers]   = useState<LocalSupplier[]>([]);
  const [products, setProducts]     = useState<ProductRecord[]>([]);

  // Item line being added
  const [lineProduct, setLineProduct]   = useState("");
  const [lineQty, setLineQty]           = useState("1");
  const [linePrice, setLinePrice]       = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ordersApi.list({ type: "purchase" });
    if (r.data) setOrders(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    suppliersApi.list().then((r) => { if (r.data) setSuppliers(r.data as LocalSupplier[]); });
    productsApi.list().then((r) => { if (r.data) setProducts(r.data as unknown as ProductRecord[]); });
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchQ = !q || (o.orderNumber ?? "").toLowerCase().includes(q) || getSupplierName(o.supplier).toLowerCase().includes(q);
    const matchS = statusFilter === "all" || o.status === statusFilter;
    return matchQ && matchS;
  });

  const pending   = orders.filter((o) => o.status === "pending").length;
  const confirmed = orders.filter((o) => ["confirmed", "in_production"].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const total     = orders.reduce((a, o) => a + (o.total ?? 0), 0);

  function openCreate() {
    setForm(blank());
    setFormError(""); setCreateOpen(true);
  }
  function openEdit(o: OrderRecord) {
    setForm({
      type: "purchase",
      status: o.status,
      currency: o.currency ?? "USD",
      orderDate: (o.orderDate ?? "").slice(0, 10),
      dueDate: (o.dueDate ?? "").slice(0, 10),
      supplier: typeof o.supplier === "object" && o.supplier ? o.supplier._id : (o.supplier as string) ?? "",
      notes: o.notes ?? "",
      items: (o.items ?? []).map((i) => ({
        product: i.product, name: i.name, sku: i.sku ?? "",
        quantity: i.quantity, unitPrice: i.unitPrice,
      })),
    });
    setFormError(""); setEditItem(o);
  }
  function closeModals() { setCreateOpen(false); setEditItem(null); setDeleteId(null); setDetailItem(null); setFormError(""); }

  function addLine() {
    const prod = products.find((p) => p._id === lineProduct);
    if (!prod || Number(lineQty) < 1) return;
    setForm((p) => ({
      ...p,
      items: [...p.items, { product: prod._id, name: prod.name, sku: prod.sku, quantity: Number(lineQty), unitPrice: Number(linePrice) }],
    }));
    setLineProduct(""); setLineQty("1"); setLinePrice("0");
  }

  function removeLine(idx: number) {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!form.supplier) { setFormError("Please select a supplier."); return; }
    if (form.items.length === 0) { setFormError("Add at least one item."); return; }
    setSaving(true); setFormError("");
    const payload = {
      ...form,
      items: form.items.map((i) => ({ ...i, total: i.quantity * i.unitPrice })),
    };
    const r = editItem
      ? await ordersApi.update(editItem._id, payload)
      : await ordersApi.create(payload);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    closeModals();
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await ordersApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  async function handleStatusChange(id: string, status: string) {
    await ordersApi.updateStatus(id, status);
    void load();
  }

  return (
    <PageShell
      title="Purchase"
      subtitle="Purchase orders, supplier invoices, and procurement tracking."
      action={<ActionButton label="+ New PO" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Pending Approval" value={String(pending)}   sub="Awaiting sign-off"     accent />
        <KpiCard label="Confirmed/Active" value={String(confirmed)} sub="In progress"                  />
        <KpiCard label="Delivered"        value={String(delivered)} sub="Fully received"               />
        <KpiCard label="Total Value"      value={`$${(total / 1000).toFixed(0)}K`} sub="All orders"    />
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search POs…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        {(["all", ...STATUSES] as const).map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${statusFilter === f ? "var(--accent)" : "var(--card-border)"}`, background: statusFilter === f ? "var(--accent)" : "var(--card-bg)", color: statusFilter === f ? "#fff" : "var(--text)", fontSize: "12px", cursor: "pointer" }}>
            {f === "all" ? "All" : STATUS_LABEL[f] ?? f}
          </button>
        ))}
      </div>

      {/* Table */}
      <SectionCard title="Purchase Orders" subtitle={loading ? "Loading…" : `${filtered.length} orders`}>
        <DataTable columns={["PO #", "Supplier", "Items", "Total", "Order Date", "Due Date", "Currency", "Status", "Actions"]}>
          {filtered.map((o, idx) => (
            <DataRow key={o._id} index={idx} cells={[
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailItem(o)}>{o.orderNumber}</span>,
              <span style={{ fontWeight: 500 }}>{getSupplierName(o.supplier)}</span>,
              String(o.items?.length ?? 0),
              <span style={{ fontWeight: 600 }}>{o.currency} {(o.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>,
              (o.orderDate ?? "").slice(0, 10),
              (o.dueDate ?? "—").slice(0, 10) || "—",
              o.currency ?? "USD",
              <StatusPill label={STATUS_LABEL[o.status] ?? o.status} variant={STATUS_VARIANT[o.status] ?? "neutral"} />,
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(o)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>Edit</button>
                <button onClick={() => setDeleteId(o._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>Delete</button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>No purchase orders found.</div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editItem} title={editItem ? "Edit Purchase Order" : "New Purchase Order"} onClose={closeModals} width={680}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Supplier" required>
            <select
              value={form.supplier}
              onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}
              style={{ border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", width: "100%" }}
            >
              <option value="">— Select Supplier —</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v }))} options={STATUSES.map((s) => s)} />
          </FormField>
          <FormField label="Order Date">
            <Input value={form.orderDate} onChange={(v) => setForm((p) => ({ ...p, orderDate: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Due Date">
            <Input value={form.dueDate} onChange={(v) => setForm((p) => ({ ...p, dueDate: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Currency">
            <Select value={form.currency} onChange={(v) => setForm((p) => ({ ...p, currency: v }))} options={CURRENCIES} />
          </FormField>
        </FormGrid>

        {/* Line Items */}
        <div style={{ padding: "0 24px 16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-h)", marginBottom: "10px" }}>Order Lines</div>
          {form.items.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--table-head-bg)" }}>
                  {["Product", "Qty", "Unit Price", "Line Total", ""].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, fontSize: "11px", color: "var(--text)", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td style={{ padding: "6px 10px" }}>{item.name}</td>
                    <td style={{ padding: "6px 10px" }}>{item.quantity}</td>
                    <td style={{ padding: "6px 10px" }}>{item.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>{(item.quantity * item.unitPrice).toFixed(2)}</td>
                    <td style={{ padding: "6px 10px" }}>
                      <button onClick={() => removeLine(i)} style={{ color: "var(--error-text)", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Add line */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <select
              value={lineProduct}
              onChange={(e) => {
                setLineProduct(e.target.value);
                const p = products.find((x) => x._id === e.target.value);
                if (p) setLinePrice(String(p.costPrice ?? 0));
              }}
              style={{ flex: 2, minWidth: "150px", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
            >
              <option value="">— Select Product —</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
            </select>
            <input value={lineQty} onChange={(e) => setLineQty(e.target.value)} placeholder="Qty" type="number" min="1"
              style={{ width: "70px", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }} />
            <input value={linePrice} onChange={(e) => setLinePrice(e.target.value)} placeholder="Price" type="number" min="0"
              style={{ width: "90px", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }} />
            <button onClick={addLine} disabled={!lineProduct}
              style={{ padding: "8px 14px", borderRadius: "6px", border: "none", background: "var(--accent)", color: "#fff", fontSize: "13px", cursor: lineProduct ? "pointer" : "not-allowed", opacity: lineProduct ? 1 : 0.5 }}>
              + Add
            </button>
          </div>
        </div>

        <FormField label="Notes" style={{ padding: "0 24px 8px" }}>
          <Textarea value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Internal notes…" rows={2} />
        </FormField>

        <FormActions onCancel={closeModals} onSubmit={handleSave} submitLabel={editItem ? "Update PO" : "Create PO"} loading={saving} />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Purchase Order Details" onClose={() => setDetailItem(null)} width={600}>
        {detailItem && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px", marginBottom: "16px" }}>
              {[
                ["PO #", detailItem.orderNumber],
                ["Supplier", getSupplierName(detailItem.supplier)],
                ["Status", STATUS_LABEL[detailItem.status] ?? detailItem.status],
                ["Currency", detailItem.currency],
                ["Order Date", (detailItem.orderDate ?? "").slice(0, 10)],
                ["Due Date", (detailItem.dueDate ?? "—").slice(0, 10)],
                ["Total", `${detailItem.currency} ${(detailItem.total ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
                ["Items", String(detailItem.items?.length ?? 0)],
              ].map(([label, value]) => (
                <div key={label} style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "8px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text)", fontWeight: 600, marginBottom: "2px" }}>{label}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-h)" }}>{value}</div>
                </div>
              ))}
            </div>
            {detailItem.notes && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "11px", color: "var(--text)", fontWeight: 600, marginBottom: "4px" }}>NOTES</div>
                <div style={{ fontSize: "13px", color: "var(--text-h)" }}>{detailItem.notes}</div>
              </div>
            )}
            {/* Quick status change */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {STATUSES.filter((s) => s !== detailItem.status).slice(0, 4).map((s) => (
                <button key={s} onClick={() => { handleStatusChange(detailItem._id, s); setDetailItem(null); }}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "12px" }}>
                  → {STATUS_LABEL[s] ?? s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button onClick={() => { setDetailItem(null); openEdit(detailItem); }}
                style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "13px" }}>Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Purchase Order"
        message="Delete this purchase order permanently?" onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)} danger />
    </PageShell>
  );
}
