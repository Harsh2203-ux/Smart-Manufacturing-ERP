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
import { ordersApi, customersApi, type OrderRecord, type CustomerRecord } from "../api/businessApi";
import { productsApi, type ProductRecord } from "../api/manufacturingApi";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = ["draft", "pending", "confirmed", "in_production", "shipped", "delivered", "cancelled", "returned"] as const;
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AED", "CAD"];

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending: "Pending", confirmed: "Confirmed",
  in_production: "In Production", shipped: "Shipped", delivered: "Delivered",
  cancelled: "Cancelled", returned: "Returned",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  draft: "neutral", pending: "warning", confirmed: "info",
  in_production: "info", shipped: "warning", delivered: "success",
  cancelled: "error", returned: "error",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCustomerName(c: OrderRecord["customer"]): string {
  if (!c) return "—";
  if (typeof c === "string") return c;
  return c.name;
}

// ─── Blank form ────────────────────────────────────────────────────────────────

type LineItem = { product: string; name: string; sku: string; quantity: number; unitPrice: number };

function blank() {
  return {
    type: "sales" as const,
    status: "draft",
    currency: "USD",
    orderDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    customer: "",
    notes: "",
    items: [] as LineItem[],
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Orders() {
  const [items, setItems]           = useState<OrderRecord[]>([]);
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
  const [customers, setCustomers]   = useState<CustomerRecord[]>([]);
  const [products, setProducts]     = useState<ProductRecord[]>([]);

  // Load orders
  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = { type: "sales" };
    if (search)                 params.search = search;
    if (statusFilter !== "all") params.status = statusFilter;
    const r = await ordersApi.list(params);
    if (r.data) setItems(r.data);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    customersApi.list({ limit: "200" }).then((r) => { if (r.data) setCustomers(r.data); });
    productsApi.list({ limit: "200" }).then((r) => { if (r.data) setProducts(r.data); });
  }, []);

  // KPIs
  const totalValue = items.reduce((s, o) => s + (o.total ?? 0), 0);
  const pending    = items.filter((o) => o.status === "pending").length;
  const processing = items.filter((o) => o.status === "confirmed" || o.status === "in_production").length;
  const shipped    = items.filter((o) => o.status === "shipped").length;

  // Line item helpers
  function addLineItem() {
    setForm((p) => ({
      ...p,
      items: [...p.items, { product: "", name: "", sku: "", quantity: 1, unitPrice: 0 }],
    }));
  }
  function removeLineItem(idx: number) {
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  }
  function setLineItem(idx: number, field: keyof LineItem, value: string | number) {
    setForm((p) => {
      const items = [...p.items];
      items[idx] = { ...items[idx], [field]: value };
      // auto-fill name/sku from product selection
      if (field === "product") {
        const prod = products.find((pr) => pr._id === value);
        if (prod) {
          items[idx].name = prod.name;
          items[idx].sku  = prod.sku;
          items[idx].unitPrice = prod.sellingPrice ?? prod.costPrice ?? 0;
        }
      }
      return { ...p, items };
    });
  }

  function openCreate() { setForm(blank()); setFormError(""); setCreateOpen(true); }
  function openEdit(o: OrderRecord) {
    setForm({
      type: "sales",
      status: o.status,
      currency: o.currency ?? "USD",
      orderDate: String(o.orderDate ?? "").slice(0, 10),
      dueDate: String(o.dueDate ?? "").slice(0, 10),
      customer: typeof o.customer === "object" && o.customer ? o.customer._id : (o.customer as string ?? ""),
      notes: o.notes ?? "",
      items: (o.items ?? []).map((it) => ({
        product: it.product as string ?? "",
        name:    it.name ?? "",
        sku:     it.sku ?? "",
        quantity:it.quantity ?? 1,
        unitPrice: it.unitPrice ?? 0,
      })),
    });
    setFormError("");
    setEditItem(o);
  }
  function closeModals() { setCreateOpen(false); setEditItem(null); setDeleteId(null); setDetailItem(null); setFormError(""); }

  async function handleSave() {
    if (!form.customer)               { setFormError("Customer is required."); return; }
    if (!form.orderDate)              { setFormError("Order date is required."); return; }
    if (form.items.length === 0)      { setFormError("Add at least one line item."); return; }
    for (const it of form.items) {
      if (!it.name.trim())           { setFormError("All line items must have a name."); return; }
      if (it.quantity < 1)           { setFormError("Quantity must be at least 1."); return; }
    }
    setSaving(true); setFormError("");
    const payload = {
      ...form,
      items: form.items.map((it) => ({
        product:   it.product || it.name, // backend accepts ObjectId or name string
        name:      it.name,
        sku:       it.sku || it.name.slice(0, 10).toUpperCase().replace(/\s/g, "-"),
        quantity:  Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        total:     Number(it.quantity) * Number(it.unitPrice),
      })),
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
      title="Orders"
      subtitle="Customer sales orders, fulfilment status, and delivery tracking."
      action={<ActionButton label="+ New Order" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Total Order Value" value={`$${(totalValue / 1000).toFixed(1)}K`} sub="All sales orders" accent />
        <KpiCard label="Pending"           value={String(pending)}    sub="Awaiting confirmation"    />
        <KpiCard label="Processing"        value={String(processing)} sub="Confirmed / In production" />
        <KpiCard label="Shipped"           value={String(shipped)}    sub="En route to customer"     />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", fontSize: "13px", cursor: "pointer" }}>
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <SectionCard title="Order Register" subtitle={loading ? "Loading…" : `${items.length} orders`}>
        <DataTable columns={["Order #", "Customer", "Items", "Value", "Currency", "Status", "Order Date", "Due Date", "Actions"]}>
          {items.map((order, idx) => (
            <DataRow key={order._id} index={idx} cells={[
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailItem(order)}>
                {order.orderNumber}
              </span>,
              <span style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setDetailItem(order)}>
                {getCustomerName(order.customer)}
              </span>,
              String((order.items ?? []).length),
              <span style={{ fontWeight: 600, color: "var(--text-h)" }}>${(order.total ?? 0).toLocaleString()}</span>,
              order.currency ?? "USD",
              <StatusPill label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? "neutral"} />,
              String(order.orderDate ?? "—").slice(0, 10),
              order.dueDate ? String(order.dueDate).slice(0, 10) : "—",
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(order)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>Edit</button>
                <button onClick={() => setDeleteId(order._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>Delete</button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && items.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>
            No orders found.{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} onClick={openCreate}>
              Create the first order →
            </span>
          </div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editItem} title={editItem ? "Edit Order" : "New Sales Order"} onClose={closeModals} width={680}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Customer" required>
            <Select value={form.customer} onChange={(e) => setForm((p) => ({ ...p, customer: e.target.value }))}>
              <option value="">— Select customer —</option>
              {customers.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </FormField>
          <FormField label="Order Date" required>
            <Input type="date" value={form.orderDate} onChange={(e) => setForm((p) => ({ ...p, orderDate: e.target.value }))} />
          </FormField>
          <FormField label="Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
          </FormField>
          <FormField label="Currency">
            <Select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
        </FormGrid>

        {/* Line items */}
        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Line Items
          </div>
          {form.items.map((it, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "8px", alignItems: "end" }}>
              <FormField label={i === 0 ? "Product / Name" : ""}>
                <select
                  value={it.product}
                  onChange={(e) => setLineItem(i, "product", e.target.value)}
                  style={{ border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", width: "100%" }}
                >
                  <option value="">— Select product —</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </FormField>
              <FormField label={i === 0 ? "Qty" : ""}>
                <Input type="number" min="1" value={String(it.quantity)}
                  onChange={(e) => setLineItem(i, "quantity", Number(e.target.value))} />
              </FormField>
              <FormField label={i === 0 ? "Unit Price" : ""}>
                <Input type="number" min="0" value={String(it.unitPrice)}
                  onChange={(e) => setLineItem(i, "unitPrice", Number(e.target.value))} />
              </FormField>
              <button onClick={() => removeLineItem(i)}
                style={{ padding: "8px 12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)", fontSize: "13px", marginTop: i === 0 ? "22px" : "0" }}>
                ×
              </button>
            </div>
          ))}
          <button onClick={addLineItem}
            style={{ padding: "7px 14px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", fontSize: "12px", color: "var(--accent)", fontWeight: 600 }}>
            + Add Line Item
          </button>
          {form.items.length > 0 && (
            <div style={{ marginTop: "10px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "var(--text-h)" }}>
              Total: ${form.items.reduce((s, it) => s + Number(it.quantity) * Number(it.unitPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>

        <FormField label="Notes" style={{ marginTop: "12px" }}>
          <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" rows={2} />
        </FormField>
        <FormActions onCancel={closeModals} onSubmit={handleSave} submitLabel={editItem ? "Update Order" : "Create Order"} loading={saving} />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Order Details" onClose={() => setDetailItem(null)} width={500}>
        {detailItem && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {([
              ["Order #",    detailItem.orderNumber],
              ["Customer",   getCustomerName(detailItem.customer)],
              ["Status",     STATUS_LABEL[detailItem.status] ?? detailItem.status],
              ["Currency",   detailItem.currency ?? "USD"],
              ["Subtotal",   `$${(detailItem.subtotal ?? 0).toLocaleString()}`],
              ["Total",      `$${(detailItem.total ?? 0).toLocaleString()}`],
              ["Order Date", String(detailItem.orderDate ?? "—").slice(0, 10)],
              ["Due Date",   detailItem.dueDate ? String(detailItem.dueDate).slice(0, 10) : "—"],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "var(--text-h)", fontSize: "13px" }}>{value}</span>
              </div>
            ))}
            {/* Line items */}
            {(detailItem.items ?? []).length > 0 && (
              <div>
                <div style={{ fontWeight: 700, fontSize: "12px", color: "var(--text)", marginBottom: "6px", textTransform: "uppercase" }}>Line Items</div>
                {detailItem.items.map((it, i) => (
                  <div key={i} style={{ fontSize: "13px", color: "var(--text-h)", padding: "4px 0", borderBottom: "1px solid var(--card-border)" }}>
                    {it.name} × {it.quantity} @ ${it.unitPrice} = ${((it.quantity ?? 0) * (it.unitPrice ?? 0)).toLocaleString()}
                  </div>
                ))}
              </div>
            )}
            {/* Status change shortcuts */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
              {STATUSES.filter((s) => s !== detailItem.status).slice(0, 4).map((s) => (
                <button key={s} onClick={() => { handleStatusChange(detailItem._id, s); setDetailItem(null); }}
                  style={{ padding: "5px 10px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "12px" }}>
                  → {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setDetailItem(null); openEdit(detailItem); }}
                style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "13px" }}>
                Edit
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Order"
        message="Delete this sales order permanently?" onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)} danger />
    </PageShell>
  );
}
