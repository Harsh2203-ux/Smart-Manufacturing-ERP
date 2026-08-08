import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, Input, Select, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { customersApi, type CustomerRecord } from "../api/businessApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const INDUSTRIES = ["Automotive", "Energy", "Pharma", "Food & Beverage", "Electronics", "Construction", "Mining", "Aerospace", "Rail Transport", "Manufacturing", "Other"];
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Net 7"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AED", "CAD"];

// ── Blank form ────────────────────────────────────────────────────────────────

function blank(): Partial<CustomerRecord> & Record<string, unknown> {
  return {
    customerNumber: "", name: "", type: "business",
    contactPerson: "", email: "", phone: "",
    address: { city: "", country: "" },
    industry: "Manufacturing", creditLimit: 100000,
    paymentTerms: "Net 30", currency: "USD",
    isActive: true, isVip: false,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Customers() {
  const [items, setItems]           = useState<CustomerRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<CustomerRecord | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState<Partial<CustomerRecord> & Record<string, unknown>>(blank());
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [detailItem, setDetailItem] = useState<CustomerRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await customersApi.list();
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || (c.customerNumber ?? "").toLowerCase().includes(q) || (c.industry ?? "").toLowerCase().includes(q);
    const matchS = statusFilter === "all"
      || (statusFilter === "active" && c.isActive)
      || (statusFilter === "inactive" && !c.isActive)
      || (statusFilter === "vip" && c.isVip);
    return matchQ && matchS;
  });

  const active = items.filter((c) => c.isActive).length;
  const vip    = items.filter((c) => c.isVip).length;
  const inactive = items.filter((c) => !c.isActive).length;

  function openCreate() { setForm(blank()); setFormError(""); setCreateOpen(true); }
  function openEdit(c: CustomerRecord) { setForm({ ...c, address: { ...c.address } }); setFormError(""); setEditItem(c); }
  function closeModals() { setCreateOpen(false); setEditItem(null); setDeleteId(null); setFormError(""); }

  function setField(key: string, val: unknown) {
    if (key === "city" || key === "country") {
      setForm((p) => ({ ...p, address: { ...(p.address as object), [key]: val } }));
    } else {
      setForm((p) => ({ ...p, [key]: val }));
    }
  }

  async function handleSave() {
    if (!form.name?.toString().trim()) { setFormError("Customer name is required."); return; }
    setSaving(true); setFormError("");
    const payload = { ...form };
    const r = editItem
      ? await customersApi.update(editItem._id, payload)
      : await customersApi.create(payload);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    closeModals();
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await customersApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  const addr = (c: CustomerRecord) =>
    [c.address?.city, c.address?.country].filter(Boolean).join(", ") || "—";

  return (
    <PageShell
      title="Customers"
      subtitle="Customer accounts, credit limits, order history, and account management."
      action={<ActionButton label="+ Add Customer" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Active Customers" value={String(active)}   sub="Current accounts"   accent />
        <KpiCard label="VIP Customers"    value={String(vip)}      sub="Priority accounts"         />
        <KpiCard label="Inactive"         value={String(inactive)} sub="Paused accounts"           />
        <KpiCard label="Total"            value={String(items.length)} sub="All customers"         />
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        {(["all","active","inactive","vip"] as const).map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${statusFilter === f ? "var(--accent)" : "var(--card-border)"}`, background: statusFilter === f ? "var(--accent)" : "var(--card-bg)", color: statusFilter === f ? "#fff" : "var(--text)", fontSize: "13px", cursor: "pointer", textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <SectionCard title="Customer Accounts" subtitle={loading ? "Loading…" : `${filtered.length} customers`}>
        <DataTable columns={["No.", "Name", "Type", "Industry", "Location", "Contact", "Email", "Credit Limit", "Currency", "Terms", "Status", "Actions"]}>
          {filtered.map((c, idx) => (
            <DataRow key={c._id} index={idx} cells={[
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailItem(c)}>{c.customerNumber || "—"}</span>,
              <span style={{ fontWeight: 600, cursor: "pointer", color: "var(--text-h)" }} onClick={() => setDetailItem(c)}>
                {c.name}{c.isVip && <span style={{ marginLeft: "6px", fontSize: "10px", background: "#fef3c7", color: "#b45309", borderRadius: "4px", padding: "1px 5px" }}>VIP</span>}
              </span>,
              <StatusPill label={c.type === "business" ? "Business" : "Individual"} variant={c.type === "business" ? "info" : "neutral"} />,
              c.industry ?? "—",
              addr(c),
              c.contactPerson ?? "—",
              <span style={{ fontSize: "12px" }}>{c.email ?? "—"}</span>,
              <span style={{ fontWeight: 600 }}>{c.currency} {((c.creditLimit ?? 0) / 1000).toFixed(0)}K</span>,
              c.currency ?? "USD",
              c.paymentTerms ?? "—",
              <StatusPill label={c.isActive ? "Active" : "Inactive"} variant={c.isActive ? "success" : "neutral"} />,
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(c)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>Edit</button>
                <button onClick={() => setDeleteId(c._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>Delete</button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>No customers found.</div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editItem} title={editItem ? "Edit Customer" : "Add Customer"} onClose={closeModals}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Customer Number">
            <Input value={String(form.customerNumber ?? "")} onChange={(v) => setField("customerNumber", v)} placeholder="e.g. CUST-001" />
          </FormField>
          <FormField label="Customer Name" required>
            <Input value={String(form.name ?? "")} onChange={(v) => setField("name", v)} placeholder="Company or person name" />
          </FormField>
          <FormField label="Type">
            <Select value={String(form.type ?? "business")} onChange={(v) => setField("type", v)} options={["business", "individual"]} />
          </FormField>
          <FormField label="Contact Person">
            <Input value={String(form.contactPerson ?? "")} onChange={(v) => setField("contactPerson", v)} placeholder="Full name" />
          </FormField>
          <FormField label="Email">
            <Input value={String(form.email ?? "")} onChange={(v) => setField("email", v)} placeholder="email@company.com" />
          </FormField>
          <FormField label="Phone">
            <Input value={String(form.phone ?? "")} onChange={(v) => setField("phone", v)} placeholder="+1-555-0000" />
          </FormField>
          <FormField label="City">
            <Input value={String((form.address as Record<string,string>)?.city ?? "")} onChange={(v) => setField("city", v)} placeholder="City" />
          </FormField>
          <FormField label="Country">
            <Input value={String((form.address as Record<string,string>)?.country ?? "")} onChange={(v) => setField("country", v)} placeholder="Country" />
          </FormField>
          <FormField label="Industry">
            <Select value={String(form.industry ?? "Manufacturing")} onChange={(v) => setField("industry", v)} options={INDUSTRIES} />
          </FormField>
          <FormField label="Credit Limit">
            <Input value={String(form.creditLimit ?? 100000)} onChange={(v) => setField("creditLimit", Number(v))} placeholder="100000" />
          </FormField>
          <FormField label="Payment Terms">
            <Select value={String(form.paymentTerms ?? "Net 30")} onChange={(v) => setField("paymentTerms", v)} options={PAYMENT_TERMS} />
          </FormField>
          <FormField label="Currency">
            <Select value={String(form.currency ?? "USD")} onChange={(v) => setField("currency", v)} options={CURRENCIES} />
          </FormField>
          <FormField label="Status">
            <Select value={form.isActive ? "Active" : "Inactive"} onChange={(v) => setField("isActive", v === "Active")} options={["Active", "Inactive"]} />
          </FormField>
          <FormField label="VIP Customer">
            <Select value={form.isVip ? "Yes" : "No"} onChange={(v) => setField("isVip", v === "Yes")} options={["No", "Yes"]} />
          </FormField>
        </FormGrid>
        <FormActions onCancel={closeModals} onSubmit={handleSave} submitLabel={editItem ? "Update" : "Create"} loading={saving} />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Customer Details" onClose={() => setDetailItem(null)} width={480}>
        {detailItem && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              ["Number", detailItem.customerNumber],
              ["Name", detailItem.name],
              ["Type", detailItem.type],
              ["Contact", detailItem.contactPerson],
              ["Email", detailItem.email],
              ["Phone", detailItem.phone],
              ["Location", addr(detailItem)],
              ["Industry", detailItem.industry],
              ["Credit Limit", `${detailItem.currency} ${(detailItem.creditLimit ?? 0).toLocaleString()}`],
              ["Payment Terms", detailItem.paymentTerms],
              ["Currency", detailItem.currency],
              ["Status", detailItem.isActive ? "Active" : "Inactive"],
              ["VIP", detailItem.isVip ? "Yes" : "No"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "var(--text-h)", fontSize: "13px" }}>{value}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={() => { setDetailItem(null); openEdit(detailItem); }} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "13px" }}>Edit</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </PageShell>
  );
}
