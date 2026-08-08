import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, Input, Select, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { suppliersApi, type SupplierRecord } from "../api/businessApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function starRating(r: number) {
  const full = Math.floor(r);
  const color = r >= 4.5 ? "var(--success-text)" : r >= 3.5 ? "var(--warning-text)" : "var(--error-text)";
  return (
    <span style={{ fontWeight: 600, color, fontSize: "13px" }}>
      {"★".repeat(full)}{"☆".repeat(5 - full)} {r.toFixed(1)}
    </span>
  );
}

const CATEGORIES = ["Electronics", "Mechanical", "Raw Material", "Hydraulics", "Consumables", "Automation", "Castings", "Sheet Metal", "Fluid Control", "Packaging", "Other"];
const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "50% Advance", "COD", "Net 7"];

// ── Blank form ────────────────────────────────────────────────────────────────

function blank(): Partial<SupplierRecord> & Record<string, unknown> {
  return {
    code: "", name: "", contactPerson: "", email: "", phone: "",
    address: { city: "", country: "" },
    category: "Raw Material", paymentTerms: "Net 30",
    leadTimeDays: 7, rating: 4.0,
    isActive: true, isPreferred: false,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Suppliers() {
  const [items, setItems]           = useState<SupplierRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<SupplierRecord | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState<Partial<SupplierRecord> & Record<string, unknown>>(blank());
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [detailItem, setDetailItem] = useState<SupplierRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await suppliersApi.list();
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q);
    const matchS = statusFilter === "all"
      || (statusFilter === "active" && s.isActive)
      || (statusFilter === "inactive" && !s.isActive)
      || (statusFilter === "preferred" && s.isPreferred);
    return matchQ && matchS;
  });

  const active    = items.filter((s) => s.isActive).length;
  const preferred = items.filter((s) => s.isPreferred).length;
  const inactive  = items.filter((s) => !s.isActive).length;
  const avgRating = active > 0
    ? (items.filter((s) => s.isActive).reduce((a, s) => a + (s.rating ?? 0), 0) / active).toFixed(1)
    : "—";

  function openCreate() { setForm(blank()); setFormError(""); setCreateOpen(true); }
  function openEdit(s: SupplierRecord) { setForm({ ...s, address: { ...s.address } }); setFormError(""); setEditItem(s); }
  function closeModals() { setCreateOpen(false); setEditItem(null); setDeleteId(null); setFormError(""); }

  function setField(key: string, val: unknown) {
    if (key === "city" || key === "country") {
      setForm((p) => ({ ...p, address: { ...(p.address as object), [key]: val } }));
    } else {
      setForm((p) => ({ ...p, [key]: val }));
    }
  }

  async function handleSave() {
    if (!form.name?.toString().trim()) { setFormError("Supplier name is required."); return; }
    if (!form.code?.toString().trim()) { setFormError("Supplier code is required."); return; }
    setSaving(true); setFormError("");
    const payload = { ...form };
    const r = editItem
      ? await suppliersApi.update(editItem._id, payload)
      : await suppliersApi.create(payload);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    closeModals();
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await suppliersApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  const addr = (s: SupplierRecord) =>
    [s.address?.city, s.address?.country].filter(Boolean).join(", ") || "—";

  return (
    <PageShell
      title="Suppliers"
      subtitle="Supplier directory, performance ratings, and vendor management."
      action={<ActionButton label="+ Add Supplier" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Active Suppliers"  value={String(active)}    sub="Current vendors"     accent />
        <KpiCard label="Preferred"         value={String(preferred)} sub="Priority vendors"           />
        <KpiCard label="Inactive"          value={String(inactive)}  sub="Paused suppliers"           />
        <KpiCard label="Avg Rating"        value={String(avgRating)} sub="Active vendors avg"         />
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        {(["all","active","inactive","preferred"] as const).map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${statusFilter === f ? "var(--accent)" : "var(--card-border)"}`, background: statusFilter === f ? "var(--accent)" : "var(--card-bg)", color: statusFilter === f ? "#fff" : "var(--text)", fontSize: "13px", cursor: "pointer", textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <SectionCard title="Supplier Directory" subtitle={loading ? "Loading…" : `${filtered.length} suppliers`}>
        <DataTable columns={["Code", "Name", "Location", "Category", "Contact", "Email", "Payment Terms", "Lead", "Rating", "Status", "Actions"]}>
          {filtered.map((s, idx) => (
            <DataRow key={s._id} index={idx} cells={[
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailItem(s)}>{s.code}</span>,
              <span style={{ fontWeight: 600, cursor: "pointer", color: "var(--text-h)" }} onClick={() => setDetailItem(s)}>{s.name}{s.isPreferred && <span style={{ marginLeft: "6px", fontSize: "10px", background: "var(--brand-100)", color: "var(--accent)", borderRadius: "4px", padding: "1px 5px" }}>PREF</span>}</span>,
              addr(s),
              s.category ?? "—",
              s.contactPerson ?? "—",
              <span style={{ fontSize: "12px" }}>{s.email ?? "—"}</span>,
              s.paymentTerms ?? "—",
              `${s.leadTimeDays ?? 0}d`,
              starRating(s.rating ?? 0),
              <StatusPill label={s.isActive ? "Active" : "Inactive"} variant={s.isActive ? "success" : "neutral"} />,
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(s)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>Edit</button>
                <button onClick={() => setDeleteId(s._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>Delete</button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>No suppliers found.</div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editItem} title={editItem ? "Edit Supplier" : "Add Supplier"} onClose={closeModals}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Supplier Code" required>
            <Input value={String(form.code ?? "")} onChange={(v) => setField("code", v)} placeholder="e.g. SUP-001" />
          </FormField>
          <FormField label="Supplier Name" required>
            <Input value={String(form.name ?? "")} onChange={(v) => setField("name", v)} placeholder="Company name" />
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
          <FormField label="Category">
            <Select value={String(form.category ?? "Other")} onChange={(v) => setField("category", v)} options={CATEGORIES} />
          </FormField>
          <FormField label="Payment Terms">
            <Select value={String(form.paymentTerms ?? "Net 30")} onChange={(v) => setField("paymentTerms", v)} options={PAYMENT_TERMS} />
          </FormField>
          <FormField label="Lead Time (days)">
            <Input value={String(form.leadTimeDays ?? 7)} onChange={(v) => setField("leadTimeDays", Number(v))} placeholder="7" />
          </FormField>
          <FormField label="Rating (0-5)">
            <Input value={String(form.rating ?? 4)} onChange={(v) => setField("rating", Number(v))} placeholder="4.0" />
          </FormField>
          <FormField label="Status">
            <Select value={form.isActive ? "Active" : "Inactive"} onChange={(v) => setField("isActive", v === "Active")} options={["Active", "Inactive"]} />
          </FormField>
          <FormField label="Preferred Supplier">
            <Select value={form.isPreferred ? "Yes" : "No"} onChange={(v) => setField("isPreferred", v === "Yes")} options={["No", "Yes"]} />
          </FormField>
        </FormGrid>
        <FormActions onCancel={closeModals} onSubmit={handleSave} submitLabel={editItem ? "Update" : "Create"} loading={saving} />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Supplier Details" onClose={() => setDetailItem(null)} width={480}>
        {detailItem && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              ["Code", detailItem.code],
              ["Name", detailItem.name],
              ["Contact", detailItem.contactPerson],
              ["Email", detailItem.email],
              ["Phone", detailItem.phone],
              ["Location", addr(detailItem)],
              ["Category", detailItem.category],
              ["Payment Terms", detailItem.paymentTerms],
              ["Lead Time", `${detailItem.leadTimeDays ?? 0} days`],
              ["Rating", `${detailItem.rating ?? 0} / 5`],
              ["Status", detailItem.isActive ? "Active" : "Inactive"],
              ["Preferred", detailItem.isPreferred ? "Yes" : "No"],
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
        title="Delete Supplier"
        message="Are you sure you want to delete this supplier? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </PageShell>
  );
}
