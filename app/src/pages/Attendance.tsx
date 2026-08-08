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
  Modal,
  FormField,
  FormGrid,
  FormActions,
  ErrorBanner,
  ConfirmDialog,
  NativeInput as Input,
  NativeSelect as Select,
  NativeTextarea as Textarea,
} from "../components/ui/Modal";
import {
  attendanceApi,
  type AttendanceRecord,
  type AttendanceSummary,
} from "../api/businessApi";
import { employeesApi } from "../api/businessApi";
import type { EmployeeRecord } from "../api/businessApi";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STATUSES = ["Present", "Absent", "Late", "Half Day", "On Leave", "Holiday", "Weekend"] as const;
const SHIFTS   = ["Morning", "Afternoon", "Night", "General"] as const;

const STATUS_VARIANT: Record<AttendanceRecord["status"], "success" | "warning" | "error" | "info" | "neutral"> = {
  Present:  "success",
  Absent:   "error",
  Late:     "warning",
  "Half Day": "warning",
  "On Leave": "info",
  Holiday:  "neutral",
  Weekend:  "neutral",
};

const SHIFT_VARIANT: Record<AttendanceRecord["shift"], "success" | "warning" | "error" | "info" | "neutral"> = {
  Morning:   "info",
  Afternoon: "warning",
  Night:     "error",
  General:   "neutral",
};

// ─── Blank form ────────────────────────────────────────────────────────────────

function blank(): Partial<AttendanceRecord> & Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    employeeName: "",
    employeeId:   "",
    department:   "",
    employee:     "",
    date:         today,
    shift:        "General",
    scheduledIn:  "09:00",
    scheduledOut: "18:00",
    actualIn:     "",
    actualOut:    "",
    hoursWorked:  0,
    overtime:     0,
    status:       "Present",
    note:         "",
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Attendance() {
  const [items, setItems]           = useState<AttendanceRecord[]>([]);
  const [summary, setSummary]       = useState<AttendanceSummary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [dateFilter, setDate]       = useState("today");
  const [departments, setDepts]     = useState<string[]>([]);
  const [employees, setEmployees]   = useState<EmployeeRecord[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<AttendanceRecord | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<AttendanceRecord | null>(null);
  const [form, setForm]             = useState<Partial<AttendanceRecord> & Record<string, unknown>>(blank());
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");

  // Load attendance records
  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search)                           params.search = search;
    if (statusFilter !== "all")           params.status = statusFilter;
    if (dateFilter === "today")           { /* default: backend filters today */ }
    else if (dateFilter === "all")        params.all = "1";
    else                                  params.date = dateFilter;

    const [listRes, summaryRes] = await Promise.all([
      attendanceApi.list(params),
      attendanceApi.summary(dateFilter !== "all" && dateFilter !== "today" ? { date: dateFilter } : {}),
    ]);
    if (listRes.data) setItems(listRes.data);
    if (summaryRes.data) setSummary(summaryRes.data);
    setLoading(false);
  }, [search, statusFilter, dateFilter]);

  useEffect(() => { void load(); }, [load]);

  // Load departments and employee list for the create form
  useEffect(() => {
    attendanceApi.departments().then((r) => {
      if (r.data && Array.isArray(r.data)) setDepts(r.data);
    });
    employeesApi.list({ limit: "200", status: "active" }).then((r) => {
      if (r.data) setEmployees(r.data);
    });
  }, []);

  // Derived KPIs
  const present   = summary?.present   ?? items.filter((a) => a.status === "Present").length;
  const absent    = summary?.absent    ?? items.filter((a) => a.status === "Absent").length;
  const late      = summary?.late      ?? items.filter((a) => a.status === "Late").length;
  const totalOT   = summary?.totalOT   ?? items.reduce((acc, a) => acc + (a.overtime ?? 0), 0);

  // Modal helpers
  function openCreate() { setForm(blank()); setFormError(""); setCreateOpen(true); }
  function openEdit(a: AttendanceRecord) {
    setForm({ ...a, date: String(a.date ?? "").slice(0, 10) });
    setFormError("");
    setEditItem(a);
  }
  function closeModals() {
    setCreateOpen(false); setEditItem(null);
    setDeleteId(null); setDetailItem(null); setFormError("");
  }

  // When employee is selected from dropdown, auto-fill name/id/dept
  function handleEmployeeSelect(empId: string) {
    const emp = employees.find((e) => e._id === empId);
    setForm((p) => ({
      ...p,
      employee:     empId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : p.employeeName,
      employeeId:   emp ? emp.employeeId : p.employeeId,
      department:   emp ? emp.department : p.department,
    }));
  }

  async function handleSave() {
    if (!String(form.status ?? "").trim())       { setFormError("Status is required."); return; }
    if (!String(form.date ?? "").trim())         { setFormError("Date is required."); return; }
    if (!String(form.employeeName ?? "").trim() && !form.employee) {
      setFormError("Employee name or selection is required."); return;
    }
    setSaving(true); setFormError("");
    const payload = { ...form };
    // Don't send empty string for employee ObjectId
    if (!payload.employee) delete payload.employee;

    const r = editItem
      ? await attendanceApi.update(editItem._id, payload)
      : await attendanceApi.create(payload);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    closeModals();
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await attendanceApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  return (
    <PageShell
      title="Attendance"
      subtitle="Daily attendance, shift schedules, and overtime tracking."
      action={<ActionButton label="Mark Attendance" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Present Today"  value={String(present)}              sub="On site & working"          accent />
        <KpiCard label="Absent"         value={String(absent)}               sub="Unplanned absence"                 />
        <KpiCard label="Late Arrivals"  value={String(late)}                 sub="Check-in > scheduled"              />
        <KpiCard label="Total Overtime" value={`${totalOT.toFixed(1)}h`}     sub="Today across all staff"            />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, employee ID, department…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", fontSize: "13px", cursor: "pointer" }}>
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={dateFilter} onChange={(e) => setDate(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", fontSize: "13px", cursor: "pointer" }}>
          <option value="today">Today</option>
          <option value="all">All Records</option>
        </select>
      </div>

      {/* Table */}
      <SectionCard
        title="Attendance Log"
        subtitle={loading ? "Loading…" : `${items.length} records${dateFilter === "today" ? " — today" : ""}`}
      >
        <DataTable columns={[
          "Record ID", "Emp ID", "Name", "Department",
          "Shift", "Sched. In", "Actual In", "Sched. Out", "Actual Out",
          "Hours", "OT", "Note", "Status", "Actions",
        ]}>
          {items.map((a, idx) => (
            <DataRow key={a._id} index={idx} cells={[
              <span
                style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }}
                onClick={() => setDetailItem(a)}
              >
                {a.attendanceId}
              </span>,
              <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{a.employeeId || "—"}</span>,
              <span style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => setDetailItem(a)}>
                {a.employeeName || "—"}
              </span>,
              a.department || "—",
              <StatusPill label={a.shift}   variant={SHIFT_VARIANT[a.shift]}   />,
              a.scheduledIn  || "—",
              <span style={{ color: !a.actualIn ? "var(--text)" : a.status === "Late" ? "var(--warning-text)" : "var(--success-text)" }}>
                {a.actualIn || "—"}
              </span>,
              a.scheduledOut || "—",
              <span style={{ color: a.actualOut ? "var(--text-h)" : "var(--text)" }}>
                {a.actualOut || "—"}
              </span>,
              a.hoursWorked > 0 ? `${a.hoursWorked.toFixed(2)}h` : "—",
              <span style={{ color: a.overtime > 0 ? "var(--warning-text)" : "var(--text)", fontWeight: a.overtime > 0 ? 600 : 400 }}>
                {a.overtime > 0 ? `+${a.overtime.toFixed(2)}h` : "—"}
              </span>,
              <span style={{ fontSize: "12px", color: "var(--text)", fontStyle: a.note ? "normal" : "italic" }}>
                {a.note || "—"}
              </span>,
              <StatusPill label={a.status} variant={STATUS_VARIANT[a.status]} />,
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(a)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>
                  Edit
                </button>
                <button onClick={() => setDeleteId(a._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>
                  Delete
                </button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && items.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>
            No attendance records found.{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} onClick={openCreate}>
              Mark the first record →
            </span>
          </div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal
        open={createOpen || !!editItem}
        title={editItem ? "Edit Attendance Record" : "Mark Attendance"}
        onClose={closeModals}
        width={620}
      >
        <ErrorBanner message={formError} />
        <FormGrid>
          {/* Employee selector — optional quick-fill */}
          <FormField label="Employee (optional — auto-fills fields)">
            <select
              value={String(form.employee ?? "")}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              style={{ border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", width: "100%" }}
            >
              <option value="">— Select employee —</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.firstName} {e.lastName} ({e.employeeId})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Employee Name" required>
            <Input
              value={String(form.employeeName ?? "")}
              onChange={(e) => setForm((p) => ({ ...p, employeeName: e.target.value }))}
              placeholder="Full name"
            />
          </FormField>
          <FormField label="Employee ID">
            <Input
              value={String(form.employeeId ?? "")}
              onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
              placeholder="e.g. E-10041"
            />
          </FormField>
          <FormField label="Department">
            <Input
              value={String(form.department ?? "")}
              onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
              placeholder="e.g. Production"
              list="dept-list"
            />
            <datalist id="dept-list">
              {departments.map((d) => <option key={d} value={d} />)}
            </datalist>
          </FormField>
          <FormField label="Date" required>
            <Input
              type="date"
              value={String(form.date ?? "").slice(0, 10)}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </FormField>
          <FormField label="Shift">
            <Select
              value={String(form.shift ?? "General")}
              onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value as AttendanceRecord["shift"] }))}
            >
              {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Status" required>
            <Select
              value={String(form.status ?? "Present")}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as AttendanceRecord["status"] }))}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Scheduled In">
            <Input
              type="time"
              value={String(form.scheduledIn ?? "")}
              onChange={(e) => setForm((p) => ({ ...p, scheduledIn: e.target.value }))}
            />
          </FormField>
          <FormField label="Scheduled Out">
            <Input
              type="time"
              value={String(form.scheduledOut ?? "")}
              onChange={(e) => setForm((p) => ({ ...p, scheduledOut: e.target.value }))}
            />
          </FormField>
          <FormField label="Actual In">
            <Input
              type="time"
              value={String(form.actualIn ?? "")}
              onChange={(e) => setForm((p) => ({ ...p, actualIn: e.target.value }))}
            />
          </FormField>
          <FormField label="Actual Out">
            <Input
              type="time"
              value={String(form.actualOut ?? "")}
              onChange={(e) => setForm((p) => ({ ...p, actualOut: e.target.value }))}
            />
          </FormField>
          <FormField label="Hours Worked">
            <Input
              type="number"
              value={String(form.hoursWorked ?? 0)}
              onChange={(e) => setForm((p) => ({ ...p, hoursWorked: Number(e.target.value) }))}
              placeholder="e.g. 8.5"
              min="0"
              step="0.25"
            />
          </FormField>
          <FormField label="Overtime Hours">
            <Input
              type="number"
              value={String(form.overtime ?? 0)}
              onChange={(e) => setForm((p) => ({ ...p, overtime: Number(e.target.value) }))}
              placeholder="e.g. 1.5"
              min="0"
              step="0.25"
            />
          </FormField>
        </FormGrid>
        <FormField label="Note">
          <Textarea
            value={String(form.note ?? "")}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            placeholder="Optional note…"
            rows={2}
          />
        </FormField>
        <FormActions
          onCancel={closeModals}
          onSubmit={handleSave}
          submitLabel={editItem ? "Update" : "Save Record"}
          loading={saving}
        />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Attendance Details" onClose={() => setDetailItem(null)} width={480}>
        {detailItem && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {([
              ["Record ID",   detailItem.attendanceId],
              ["Employee ID", detailItem.employeeId || "—"],
              ["Name",        detailItem.employeeName || "—"],
              ["Department",  detailItem.department || "—"],
              ["Date",        String(detailItem.date ?? "").slice(0, 10)],
              ["Shift",       detailItem.shift],
              ["Status",      detailItem.status],
              ["Sched. In",   detailItem.scheduledIn  || "—"],
              ["Actual In",   detailItem.actualIn     || "—"],
              ["Sched. Out",  detailItem.scheduledOut || "—"],
              ["Actual Out",  detailItem.actualOut    || "—"],
              ["Hours Worked",detailItem.hoursWorked > 0 ? `${detailItem.hoursWorked.toFixed(2)}h` : "—"],
              ["Overtime",    detailItem.overtime > 0 ? `+${detailItem.overtime.toFixed(2)}h` : "—"],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "var(--text-h)", fontSize: "13px" }}>{value}</span>
              </div>
            ))}
            {detailItem.note && (
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px", marginBottom: "4px" }}>Note</div>
                <div style={{ fontSize: "13px", color: "var(--text-h)" }}>{detailItem.note}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                onClick={() => { setDetailItem(null); openEdit(detailItem); }}
                style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "13px" }}
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Attendance Record"
        message="Delete this attendance record permanently?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </PageShell>
  );
}
