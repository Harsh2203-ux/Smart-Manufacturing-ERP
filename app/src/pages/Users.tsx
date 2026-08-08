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
  FormGrid, FormActions, ErrorBanner, ConfirmDialog,
} from "../components/ui/Modal";
import { apiGet, apiPut, apiDelete } from "../api/client";
import type { UserRole } from "../types";

// ─── Type ──────────────────────────────────────────────────────────────────────

interface UserRecord {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  designation?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  avatarInitials?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLES: UserRole[] = [
  "super_admin", "admin",
  "production_manager", "inventory_manager", "purchase_manager",
  "sales_manager", "quality_manager", "maintenance_manager",
  "hr_manager", "finance_manager", "operator", "employee",
];

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin", admin: "Admin",
  production_manager: "Production Mgr", inventory_manager: "Inventory Mgr",
  purchase_manager: "Purchase Mgr", sales_manager: "Sales Mgr",
  quality_manager: "Quality Mgr", maintenance_manager: "Maintenance Mgr",
  hr_manager: "HR Manager", finance_manager: "Finance Mgr",
  operator: "Operator", employee: "Employee",
};

const ROLE_VARIANT: Record<UserRole, "success" | "warning" | "error" | "info" | "neutral"> = {
  super_admin: "error", admin: "error",
  production_manager: "info", inventory_manager: "info",
  purchase_manager: "info", sales_manager: "info",
  quality_manager: "info", maintenance_manager: "info",
  hr_manager: "info", finance_manager: "info",
  operator: "neutral", employee: "neutral",
};

const DEPARTMENTS = [
  "IT", "Production", "Assembly", "Quality", "Logistics", "Maintenance",
  "Warehouse", "Finance", "HR", "Sales", "Engineering", "Management", "Other",
];

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, initials }: { name: string; initials?: string }) {
  const letters = initials || name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div style={{
      width: "30px", height: "30px", borderRadius: "50%",
      background: "var(--brand-100)", color: "var(--brand-800)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: "11px", fontWeight: 700, flexShrink: 0,
      border: "1px solid var(--brand-200)",
    }}>
      {letters}
    </div>
  );
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function toList(data: unknown): UserRecord[] {
  if (Array.isArray(data)) return data as UserRecord[];
  const d = data as Record<string, unknown> | null;
  if (d && Array.isArray(d.items)) return d.items as UserRecord[];
  return [];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

type FilterStatus = "All" | "Active" | "Inactive";

export default function Users() {
  const [users, setUsers]       = useState<UserRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<FilterStatus>("All");
  const [search, setSearch]     = useState("");
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm]         = useState({ role: "employee" as UserRole, department: "", designation: "", isActive: true });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (search)              params.set("search", search);
    if (filter === "Active") params.set("isActive", "true");
    if (filter === "Inactive") params.set("isActive", "false");
    const r = await apiGet<UserRecord[]>(`/users?${params}`);
    setUsers(toList(r.data));
    setLoading(false);
  }, [search, filter]);

  useEffect(() => { void load(); }, [load]);

  // KPIs
  const active    = users.filter((u) => u.isActive).length;
  const inactive  = users.filter((u) => !u.isActive).length;
  const admins    = users.filter((u) => u.role === "admin" || u.role === "super_admin").length;

  // Edit modal
  function openEdit(u: UserRecord) {
    setForm({ role: u.role, department: u.department ?? "", designation: u.designation ?? "", isActive: u.isActive });
    setFormError("");
    setEditUser(u);
  }

  async function handleSave() {
    if (!editUser) return;
    setSaving(true); setFormError("");
    const r = await apiPut<UserRecord>(`/users/${editUser._id}`, form);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    setEditUser(null);
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await apiDelete<void>(`/users/${deleteId}`);
    setDeleteId(null);
    void load();
  }

  return (
    <PageShell
      title="User Management"
      subtitle="System users, roles, permissions, and account status."
      action={<ActionButton label="+ Invite User" onClick={() => window.location.href = "/register"} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Total Users"    value={String(users.length)} sub="All accounts"           accent />
        <KpiCard label="Active"         value={String(active)}       sub="Currently active"              />
        <KpiCard label="Administrators" value={String(admins)}       sub="Full system access"            />
        <KpiCard label="Inactive"       value={String(inactive)}     sub="Deactivated accounts"          />
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        {(["All", "Active", "Inactive"] as FilterStatus[]).map((opt) => (
          <button key={opt} onClick={() => setFilter(opt)} style={{
            padding: "8px 16px", borderRadius: "6px",
            border: `1px solid ${filter === opt ? "var(--accent)" : "var(--card-border)"}`,
            background: filter === opt ? "var(--accent)" : "var(--card-bg)",
            color: filter === opt ? "#fff" : "var(--text)",
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}>
            {opt}
          </button>
        ))}
      </div>

      {/* Table */}
      <SectionCard title="Users" subtitle={loading ? "Loading…" : `${users.length} user${users.length !== 1 ? "s" : ""}`}>
        <DataTable columns={["User", "Email", "Role", "Department", "Status", "Last Login", "Created", "Actions"]}>
          {users.map((user, idx) => (
            <DataRow key={user._id} index={idx} cells={[
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Avatar name={user.name} initials={user.avatarInitials} />
                <span style={{ fontWeight: 500, color: "var(--text-h)" }}>{user.name}</span>
              </div>,
              <span style={{ fontSize: "12px" }}>{user.email}</span>,
              <StatusPill label={ROLE_LABEL[user.role] ?? user.role} variant={ROLE_VARIANT[user.role] ?? "neutral"} />,
              user.department || "—",
              <StatusPill label={user.isActive ? "Active" : "Inactive"} variant={user.isActive ? "success" : "neutral"} />,
              user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "—",
              user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—",
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(user)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>
                  Edit
                </button>
                <button onClick={() => setDeleteId(user._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>
                  Delete
                </button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && users.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>
            No users found.
          </div>
        )}
      </SectionCard>

      {/* Edit Modal — role, department, designation, active status */}
      <Modal open={!!editUser} title="Edit User" onClose={() => setEditUser(null)} width={480}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Role">
            <Select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select value={form.isActive ? "active" : "inactive"} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "active" }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
          <FormField label="Department">
            <Select value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>
          <FormField label="Designation">
            <Input value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} placeholder="e.g. Senior Engineer" />
          </FormField>
        </FormGrid>
        <FormActions onCancel={() => setEditUser(null)} onSubmit={handleSave} submitLabel="Update User" loading={saving} />
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete User"
        message="Delete this user account permanently? This cannot be undone."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
    </PageShell>
  );
}
