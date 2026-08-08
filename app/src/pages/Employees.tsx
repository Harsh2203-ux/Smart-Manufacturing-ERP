import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, Input, Select, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { employeesApi, type EmployeeRecord } from "../api/businessApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEPARTMENTS = ["Production", "Quality", "Maintenance", "Inventory", "Purchase", "HR", "Sales", "Finance", "IT", "Warehouse", "Engineering", "Management"];
const SHIFTS = ["Day", "Night", "Rotational", "Morning", "Evening"];
const STATUSES: EmployeeRecord["status"][] = ["active", "on_leave", "terminated", "probation"];

const STATUS_LABEL: Record<EmployeeRecord["status"], string> = {
  active: "Active", on_leave: "On Leave", terminated: "Terminated", probation: "Probation",
};

const STATUS_VARIANT: Record<EmployeeRecord["status"], "success" | "warning" | "error" | "info" | "neutral"> = {
  active: "success", on_leave: "warning", terminated: "error", probation: "info",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fullName(e: EmployeeRecord) {
  return `${e.firstName ?? ""} ${e.lastName ?? ""}`.trim() || "—";
}

function blank(): Partial<EmployeeRecord> & Record<string, unknown> {
  return {
    employeeId: "", firstName: "", lastName: "", email: "", phone: "",
    department: "Production", position: "", hireDate: new Date().toISOString().slice(0, 10),
    status: "active", shift: "Day",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Employees() {
  const [items, setItems]           = useState<EmployeeRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatus]   = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<EmployeeRecord | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<EmployeeRecord | null>(null);
  const [form, setForm]             = useState<Partial<EmployeeRecord> & Record<string, unknown>>(blank());
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [departments, setDepartments] = useState<string[]>(DEPARTMENTS);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await employeesApi.list();
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    employeesApi.departments().then((r) => {
      if (r.data && Array.isArray(r.data) && r.data.length > 0) setDepartments(r.data);
    });
  }, []);

  const filtered = items.filter((e) => {
    const q = search.toLowerCase();
    const matchQ = !q
      || fullName(e).toLowerCase().includes(q)
      || (e.employeeId ?? "").toLowerCase().includes(q)
      || (e.email ?? "").toLowerCase().includes(q)
      || (e.department ?? "").toLowerCase().includes(q)
      || (e.position ?? "").toLowerCase().includes(q);
    const matchD = deptFilter === "all" || e.department === deptFilter;
    const matchS = statusFilter === "all" || e.status === statusFilter;
    return matchQ && matchD && matchS;
  });

  const active    = items.filter((e) => e.status === "active").length;
  const onLeave   = items.filter((e) => e.status === "on_leave").length;
  const probation = items.filter((e) => e.status === "probation").length;

  function openCreate() { setForm(blank()); setFormError(""); setCreateOpen(true); }
  function openEdit(e: EmployeeRecord) { setForm({ ...e }); setFormError(""); setEditItem(e); }
  function closeModals() { setCreateOpen(false); setEditItem(null); setDeleteId(null); setDetailItem(null); setFormError(""); }

  async function handleSave() {
    if (!form.firstName?.toString().trim()) { setFormError("First name is required."); return; }
    if (!form.lastName?.toString().trim()) { setFormError("Last name is required."); return; }
    if (!form.email?.toString().trim()) { setFormError("Email is required."); return; }
    setSaving(true); setFormError("");
    const r = editItem
      ? await employeesApi.update(editItem._id, form)
      : await employeesApi.create(form);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    closeModals();
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await employeesApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  // Unique departments from actual data
  const uniqueDepts = ["all", ...Array.from(new Set(items.map((e) => e.department).filter(Boolean)))];

  return (
    <PageShell
      title="Employees"
      subtitle="Employee directory, roles, departments, and HR records."
      action={<ActionButton label="+ Add Employee" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Total Employees" value={String(items.length)} sub="Headcount"              accent />
        <KpiCard label="Active"          value={String(active)}       sub="Currently working"            />
        <KpiCard label="On Leave"        value={String(onLeave)}      sub="Approved absences"            />
        <KpiCard label="Probation"       value={String(probation)}    sub="Under probation"              />
      </div>

      {/* Search + filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", fontSize: "13px", cursor: "pointer" }}>
          {uniqueDepts.map((d) => <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>)}
        </select>
        {(["all", ...STATUSES] as const).map((f) => (
          <button key={f} onClick={() => setStatus(f)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: `1px solid ${statusFilter === f ? "var(--accent)" : "var(--card-border)"}`, background: statusFilter === f ? "var(--accent)" : "var(--card-bg)", color: statusFilter === f ? "#fff" : "var(--text)", fontSize: "12px", cursor: "pointer" }}>
            {f === "all" ? "All" : STATUS_LABEL[f as EmployeeRecord["status"]]}
          </button>
        ))}
      </div>

      {/* Table */}
      <SectionCard title="Employee Directory" subtitle={loading ? "Loading…" : `${filtered.length} employees`}>
        <DataTable columns={["Emp ID", "Full Name", "Department", "Position", "Email", "Phone", "Shift", "Hire Date", "Status", "Actions"]}>
          {filtered.map((e, idx) => (
            <DataRow key={e._id} index={idx} cells={[
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailItem(e)}>{e.employeeId || "—"}</span>,
              <span style={{ fontWeight: 600, cursor: "pointer", color: "var(--text-h)" }} onClick={() => setDetailItem(e)}>{fullName(e)}</span>,
              e.department ?? "—",
              e.position ?? "—",
              <span style={{ fontSize: "12px" }}>{e.email ?? "—"}</span>,
              e.phone ?? "—",
              e.shift ?? "—",
              (e.hireDate ?? "").slice(0, 10),
              <StatusPill label={STATUS_LABEL[e.status]} variant={STATUS_VARIANT[e.status]} />,
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(e)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>Edit</button>
                <button onClick={() => setDeleteId(e._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>Delete</button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>No employees found.</div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editItem} title={editItem ? "Edit Employee" : "Add Employee"} onClose={closeModals}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Employee ID">
            <Input value={String(form.employeeId ?? "")} onChange={(v) => setForm((p) => ({ ...p, employeeId: v }))} placeholder="e.g. E-10001" />
          </FormField>
          <FormField label="First Name" required>
            <Input value={String(form.firstName ?? "")} onChange={(v) => setForm((p) => ({ ...p, firstName: v }))} placeholder="First name" />
          </FormField>
          <FormField label="Last Name" required>
            <Input value={String(form.lastName ?? "")} onChange={(v) => setForm((p) => ({ ...p, lastName: v }))} placeholder="Last name" />
          </FormField>
          <FormField label="Email" required>
            <Input value={String(form.email ?? "")} onChange={(v) => setForm((p) => ({ ...p, email: v }))} placeholder="employee@company.com" />
          </FormField>
          <FormField label="Phone">
            <Input value={String(form.phone ?? "")} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="+1-555-0000" />
          </FormField>
          <FormField label="Department">
            <Select value={String(form.department ?? "Production")} onChange={(v) => setForm((p) => ({ ...p, department: v }))} options={departments} />
          </FormField>
          <FormField label="Position">
            <Input value={String(form.position ?? "")} onChange={(v) => setForm((p) => ({ ...p, position: v }))} placeholder="Job title" />
          </FormField>
          <FormField label="Shift">
            <Select value={String(form.shift ?? "Day")} onChange={(v) => setForm((p) => ({ ...p, shift: v }))} options={SHIFTS} />
          </FormField>
          <FormField label="Hire Date">
            <Input value={String(form.hireDate ?? "")} onChange={(v) => setForm((p) => ({ ...p, hireDate: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Status">
            <Select value={String(form.status ?? "active")} onChange={(v) => setForm((p) => ({ ...p, status: v as EmployeeRecord["status"] }))} options={STATUSES} />
          </FormField>
        </FormGrid>
        <FormActions onCancel={closeModals} onSubmit={handleSave} submitLabel={editItem ? "Update" : "Create"} loading={saving} />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Employee Details" onClose={() => setDetailItem(null)} width={480}>
        {detailItem && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              ["Employee ID", detailItem.employeeId],
              ["Full Name", fullName(detailItem)],
              ["Email", detailItem.email],
              ["Phone", detailItem.phone],
              ["Department", detailItem.department],
              ["Position", detailItem.position],
              ["Shift", detailItem.shift],
              ["Hire Date", (detailItem.hireDate ?? "").slice(0, 10)],
              ["Status", STATUS_LABEL[detailItem.status]],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "var(--text-h)", fontSize: "13px" }}>{value ?? "—"}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button onClick={() => { setDetailItem(null); openEdit(detailItem); }}
                style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "13px" }}>Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Employee"
        message="Are you sure you want to delete this employee record? This action cannot be undone."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
    </PageShell>
  );
}
