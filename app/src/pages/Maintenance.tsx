import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, Input, Select, Textarea, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { maintenanceApi, type MaintenanceTaskRecord } from "../api/businessApi";
import { machinesApi } from "../api/manufacturingApi";
import type { MachineRecord } from "../api/manufacturingApi";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPES: MaintenanceTaskRecord["type"][] = ["Preventive", "Corrective", "Predictive", "Emergency"];
const PRIORITIES: MaintenanceTaskRecord["priority"][] = ["Critical", "High", "Medium", "Low"];
const STATUSES: MaintenanceTaskRecord["status"][] = ["Open", "In Progress", "Completed", "Overdue"];

const STATUS_VARIANT: Record<MaintenanceTaskRecord["status"], "success" | "warning" | "error" | "info" | "neutral"> = {
  Open:          "neutral",
  "In Progress": "info",
  Completed:     "success",
  Overdue:       "error",
};

const PRIORITY_VARIANT: Record<MaintenanceTaskRecord["priority"], "success" | "warning" | "error" | "info" | "neutral"> = {
  Critical: "error",
  High:     "warning",
  Medium:   "info",
  Low:      "success",
};

const TYPE_VARIANT: Record<MaintenanceTaskRecord["type"], "success" | "warning" | "error" | "info" | "neutral"> = {
  Preventive: "success",
  Corrective: "warning",
  Predictive: "info",
  Emergency:  "error",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMachineName(m: MaintenanceTaskRecord["machine"]): string {
  if (!m) return "—";
  if (typeof m === "string") return m;
  return m.name;
}

function blank(): Partial<MaintenanceTaskRecord> & Record<string, unknown> {
  return {
    asset: "", assetId: "", type: "Preventive", priority: "Medium",
    status: "Open", assignedTo: "", estimatedHours: 2,
    scheduledDate: new Date().toISOString().slice(0, 10),
    completedDate: "", description: "", notes: "",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Maintenance() {
  const [items, setItems]           = useState<MaintenanceTaskRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [typeFilter, setType]       = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem]     = useState<MaintenanceTaskRecord | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MaintenanceTaskRecord | null>(null);
  const [form, setForm]             = useState<Partial<MaintenanceTaskRecord> & Record<string, unknown>>(blank());
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState("");
  const [machines, setMachines]     = useState<MachineRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter !== "all") params.status = statusFilter;
    if (typeFilter !== "all") params.type = typeFilter;
    const r = await maintenanceApi.list(params);
    if (r.data) setItems(r.data);
    setLoading(false);
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    machinesApi.list({ limit: "200" }).then((r) => {
      if (r.data) setMachines(r.data);
    });
  }, []);

  const open     = items.filter((t) => t.status === "Open").length;
  const inProg   = items.filter((t) => t.status === "In Progress").length;
  const overdue  = items.filter((t) => t.status === "Overdue").length;
  const critical = items.filter((t) => t.priority === "Critical").length;

  function openCreate() { setForm(blank()); setFormError(""); setCreateOpen(true); }
  function openEdit(t: MaintenanceTaskRecord) { setForm({ ...t, scheduledDate: String(t.scheduledDate ?? "").slice(0, 10), completedDate: String(t.completedDate ?? "").slice(0, 10) }); setFormError(""); setEditItem(t); }
  function closeModals() { setCreateOpen(false); setEditItem(null); setDeleteId(null); setDetailItem(null); setFormError(""); }

  async function handleSave() {
    if (!String(form.asset ?? "").trim()) { setFormError("Asset name is required."); return; }
    if (!form.scheduledDate) { setFormError("Scheduled date is required."); return; }
    setSaving(true); setFormError("");

    // Populate asset name from machine if selected
    const payload = { ...form };
    if (form.machine && typeof form.machine === "string") {
      const m = machines.find((x) => x._id === form.machine);
      if (m) {
        payload.asset = payload.asset || m.name;
        payload.assetId = payload.assetId || m.machineId;
      }
    }
    // Empty string completedDate → null
    if (!payload.completedDate) payload.completedDate = null;

    const r = editItem
      ? await maintenanceApi.update(editItem._id, payload)
      : await maintenanceApi.create(payload);
    setSaving(false);
    if (r.error) { setFormError(r.error.message); return; }
    closeModals();
    void load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await maintenanceApi.delete(deleteId);
    setDeleteId(null);
    void load();
  }

  async function handleStatusChange(id: string, status: MaintenanceTaskRecord["status"]) {
    const payload: Record<string, unknown> = { status };
    if (status === "Completed") payload.completedDate = new Date().toISOString().slice(0, 10);
    await maintenanceApi.update(id, payload);
    void load();
  }

  return (
    <PageShell
      title="Maintenance"
      subtitle="Asset maintenance schedules, work orders, and equipment uptime tracking."
      action={<ActionButton label="+ Schedule Task" onClick={openCreate} />}
    >
      {/* KPIs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Critical Tasks" value={String(critical)} sub="Requires immediate attention" accent />
        <KpiCard label="Open Tasks"     value={String(open)}     sub="Not yet started"                    />
        <KpiCard label="In Progress"    value={String(inProg)}   sub="Currently being resolved"           />
        <KpiCard label="Overdue"        value={String(overdue)}  sub="Past scheduled date"                />
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search asset, task ID, assigned to…"
          style={{ flex: 1, minWidth: "200px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", fontSize: "13px" }}
        />
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", fontSize: "13px", cursor: "pointer" }}>
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setType(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", fontSize: "13px", cursor: "pointer" }}>
          <option value="all">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Tasks table */}
      <SectionCard title="Maintenance Schedule" subtitle={loading ? "Loading…" : `${items.length} tasks`}>
        <DataTable columns={["Task ID", "Asset", "Machine ID", "Type", "Priority", "Assigned To", "Est. Hours", "Scheduled", "Completed", "Status", "Actions"]}>
          {items.map((task, idx) => (
            <DataRow key={task._id} index={idx} cells={[
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailItem(task)}>
                {task.taskNumber}
              </span>,
              <span style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setDetailItem(task)}>{task.asset}</span>,
              <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{task.assetId || getMachineName(task.machine)}</span>,
              <StatusPill label={task.type}     variant={TYPE_VARIANT[task.type]}         />,
              <StatusPill label={task.priority} variant={PRIORITY_VARIANT[task.priority]} />,
              task.assignedTo || "—",
              `${task.estimatedHours}h`,
              String(task.scheduledDate ?? "—").slice(0, 10),
              task.completedDate
                ? <span style={{ color: "var(--success-text)" }}>{String(task.completedDate).slice(0, 10)}</span>
                : <span style={{ color: "var(--text)" }}>—</span>,
              <StatusPill label={task.status} variant={STATUS_VARIANT[task.status]} />,
              <span style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => openEdit(task)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--card-border)", background: "var(--card-bg)", cursor: "pointer", color: "var(--text-h)" }}>Edit</button>
                <button onClick={() => setDeleteId(task._id)} style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "5px", border: "1px solid var(--error-text)", background: "transparent", cursor: "pointer", color: "var(--error-text)" }}>Delete</button>
              </span>,
            ]} />
          ))}
        </DataTable>
        {!loading && items.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--text)" }}>
            No maintenance tasks found.{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 600 }} onClick={openCreate}>
              Schedule the first task →
            </span>
          </div>
        )}
      </SectionCard>

      {/* Create / Edit Modal */}
      <Modal open={createOpen || !!editItem} title={editItem ? "Edit Task" : "Schedule Maintenance Task"} onClose={closeModals} width={620}>
        <ErrorBanner message={formError} />
        <FormGrid>
          <FormField label="Machine (optional — links to asset)">
            <select
              value={String(form.machine ?? "")}
              onChange={(e) => {
                const mid = e.target.value;
                const m = machines.find((x) => x._id === mid);
                setForm((p) => ({
                  ...p,
                  machine: mid,
                  asset: p.asset || (m?.name ?? ""),
                  assetId: p.assetId || (m?.machineId ?? ""),
                }));
              }}
              style={{ border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--text-h)", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", width: "100%" }}
            >
              <option value="">— Select machine (optional) —</option>
              {machines.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.machineId})</option>)}
            </select>
          </FormField>
          <FormField label="Asset Name" required>
            <Input value={String(form.asset ?? "")} onChange={(v) => setForm((p) => ({ ...p, asset: v }))} placeholder="e.g. CNC Lathe Machine" />
          </FormField>
          <FormField label="Asset ID">
            <Input value={String(form.assetId ?? "")} onChange={(v) => setForm((p) => ({ ...p, assetId: v }))} placeholder="e.g. MCH-014" />
          </FormField>
          <FormField label="Type">
            <Select value={String(form.type ?? "Preventive")} onChange={(v) => setForm((p) => ({ ...p, type: v as MaintenanceTaskRecord["type"] }))} options={[...TYPES]} />
          </FormField>
          <FormField label="Priority">
            <Select value={String(form.priority ?? "Medium")} onChange={(v) => setForm((p) => ({ ...p, priority: v as MaintenanceTaskRecord["priority"] }))} options={[...PRIORITIES]} />
          </FormField>
          <FormField label="Status">
            <Select value={String(form.status ?? "Open")} onChange={(v) => setForm((p) => ({ ...p, status: v as MaintenanceTaskRecord["status"] }))} options={[...STATUSES]} />
          </FormField>
          <FormField label="Assigned To">
            <Input value={String(form.assignedTo ?? "")} onChange={(v) => setForm((p) => ({ ...p, assignedTo: v }))} placeholder="Technician name" />
          </FormField>
          <FormField label="Estimated Hours">
            <Input value={String(form.estimatedHours ?? 2)} onChange={(v) => setForm((p) => ({ ...p, estimatedHours: Number(v) }))} placeholder="e.g. 4" />
          </FormField>
          <FormField label="Scheduled Date" required>
            <Input value={String(form.scheduledDate ?? "").slice(0, 10)} onChange={(v) => setForm((p) => ({ ...p, scheduledDate: v }))} placeholder="YYYY-MM-DD" />
          </FormField>
          <FormField label="Completed Date">
            <Input value={String(form.completedDate ?? "").slice(0, 10)} onChange={(v) => setForm((p) => ({ ...p, completedDate: v || null }))} placeholder="YYYY-MM-DD (leave blank if open)" />
          </FormField>
        </FormGrid>
        <FormField label="Description">
          <Textarea value={String(form.description ?? "")} onChange={(v) => setForm((p) => ({ ...p, description: v }))} placeholder="Describe the maintenance work…" rows={2} />
        </FormField>
        <FormField label="Notes">
          <Textarea value={String(form.notes ?? "")} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Optional notes…" rows={2} />
        </FormField>
        <FormActions onCancel={closeModals} onSubmit={handleSave} submitLabel={editItem ? "Update" : "Schedule"} loading={saving} />
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} title="Task Details" onClose={() => setDetailItem(null)} width={480}>
        {detailItem && (
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              ["Task #", detailItem.taskNumber],
              ["Asset", detailItem.asset],
              ["Asset ID", detailItem.assetId || getMachineName(detailItem.machine)],
              ["Type", detailItem.type],
              ["Priority", detailItem.priority],
              ["Status", detailItem.status],
              ["Assigned To", detailItem.assignedTo || "—"],
              ["Est. Hours", `${detailItem.estimatedHours}h`],
              ["Scheduled", String(detailItem.scheduledDate ?? "—").slice(0, 10)],
              ["Completed", detailItem.completedDate ? String(detailItem.completedDate).slice(0, 10) : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px" }}>
                <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "13px" }}>{label}</span>
                <span style={{ color: "var(--text-h)", fontSize: "13px" }}>{value}</span>
              </div>
            ))}
            {detailItem.description && (
              <div><div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px" }}>Description</div><div style={{ fontSize: "13px", color: "var(--text-h)" }}>{detailItem.description}</div></div>
            )}
            {/* Quick status change */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
              {STATUSES.filter((s) => s !== detailItem.status).map((s) => (
                <button key={s} onClick={() => { handleStatusChange(detailItem._id, s); setDetailItem(null); }}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "12px" }}>
                  → {s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => { setDetailItem(null); openEdit(detailItem); }} style={{ padding: "8px 16px", borderRadius: "7px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--text-h)", cursor: "pointer", fontSize: "13px" }}>Edit</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Delete Task"
        message="Delete this maintenance task permanently?" onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)} danger />
    </PageShell>
  );
}
