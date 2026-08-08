import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, NativeInput as Input, NativeSelect as Select, NativeTextarea as Textarea, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { machinesApi } from "../api/manufacturingApi";
import type { MachineRecord } from "../api/manufacturingApi";

const STATUS_LABEL: Record<string, string> = {
  operational: "Operational", idle: "Idle",
  maintenance: "Maintenance", breakdown: "Breakdown", decommissioned: "Decommissioned",
};
const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  operational: "success", idle: "neutral",
  maintenance: "warning", breakdown: "error", decommissioned: "neutral",
};

function OeeBar({ pct, status }: { pct: number; status: string }) {
  const color = status === "breakdown" || status === "maintenance" || status === "decommissioned"
    ? "var(--error-text)"
    : pct >= 85 ? "var(--success-text)" : pct >= 65 ? "var(--warning-text)" : "var(--error-text)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "80px", height: "6px", borderRadius: "999px", background: "var(--card-border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px" }} />
      </div>
      <span style={{ fontSize: "11px", color: "var(--text)", minWidth: "28px" }}>{pct > 0 ? `${pct}%` : "—"}</span>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface MachineFormData {
  machineId: string; name: string; type: string; manufacturer: string;
  model: string; serialNumber: string; location: string; status: string;
  oeeTarget: string; capacityPerHour: string; unit: string;
  nextMaintenanceDate: string; notes: string; isActive: string;
}

const DEFAULT_FORM: MachineFormData = {
  machineId: "", name: "", type: "", manufacturer: "",
  model: "", serialNumber: "", location: "", status: "idle",
  oeeTarget: "85", capacityPerHour: "0", unit: "pcs",
  nextMaintenanceDate: "", notes: "", isActive: "true",
};

function MachineForm({
  initial = DEFAULT_FORM, onSave, onCancel, onDelete, isEdit,
}: {
  initial?: MachineFormData;
  onSave: (d: MachineFormData) => Promise<string | null>;
  onCancel: () => void; onDelete?: () => void; isEdit?: boolean;
}) {
  const [form, setForm] = useState<MachineFormData>(initial);
  const [errors, setErrors] = useState<Partial<MachineFormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set(field: keyof MachineFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<MachineFormData> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.type.trim()) e.type = "Type is required.";
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
        <FormField label="Machine Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. CNC Mill Alpha" />
        </FormField>
        <FormField label="Machine ID">
          <Input value={form.machineId} onChange={(e) => set("machineId", e.target.value)} placeholder="e.g. MCH-001" />
        </FormField>
        <FormField label="Type" required error={errors.type}>
          <Input value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. CNC, Lathe, Welder…" />
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="idle">Idle</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="breakdown">Breakdown</option>
            <option value="decommissioned">Decommissioned</option>
          </Select>
        </FormField>
        <FormField label="Manufacturer">
          <Input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="e.g. Haas Automation" />
        </FormField>
        <FormField label="Model">
          <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="e.g. VF-3" />
        </FormField>
        <FormField label="Serial Number">
          <Input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} />
        </FormField>
        <FormField label="Location">
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Hall A" />
        </FormField>
        <FormField label="OEE Target (%)">
          <Input type="number" min="0" max="100" value={form.oeeTarget} onChange={(e) => set("oeeTarget", e.target.value)} />
        </FormField>
        <FormField label="Capacity / Hour">
          <Input type="number" min="0" value={form.capacityPerHour} onChange={(e) => set("capacityPerHour", e.target.value)} />
        </FormField>
        <FormField label="Capacity Unit">
          <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs" />
        </FormField>
        <FormField label="Next Maintenance">
          <Input type="date" value={form.nextMaintenanceDate} onChange={(e) => set("nextMaintenanceDate", e.target.value)} />
        </FormField>
      </FormGrid>
      <FormField label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </FormField>
      <FormActions
        onCancel={onCancel}
        submitLabel={isEdit ? "Update Machine" : "Register Machine"}
        loading={saving}
        destructive={isEdit}
        onDestruct={onDelete}
        destructLabel="Delete Machine"
      />
    </form>
  );
}

// ─── Detail ───────────────────────────────────────────────────────────────────

function DR({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: "1px solid var(--card-border)" }}>
      <span style={{ minWidth: "160px", fontSize: "12px", fontWeight: 600, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "var(--text-h)" }}>{value || "—"}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Machines() {
  const [records, setRecords]   = useState<MachineRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<MachineRecord | null>(null);
  const [detailRecord, setDetailRecord] = useState<MachineRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MachineRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const params: Record<string, string> = { limit: "200" };
    if (statusFilter) params.status = statusFilter;
    const res = await machinesApi.list(params);
    if (res.error) setApiError(res.error.message);
    else setRecords(res.data ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = records.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.machineId.toLowerCase().includes(q) || m.type.toLowerCase().includes(q);
  });

  const running    = records.filter((m) => m.status === "operational").length;
  const breakdown  = records.filter((m) => m.status === "breakdown").length;
  const maintenance= records.filter((m) => m.status === "maintenance").length;
  const avgOee     = records.length > 0
    ? Math.round(records.reduce((a, m) => a + m.oeeTarget, 0) / records.length) : 0;

  async function handleCreate(data: MachineFormData): Promise<string | null> {
    const body: Record<string, unknown> = {
      name: data.name.trim(), type: data.type.trim(),
      manufacturer: data.manufacturer, model: data.model,
      serialNumber: data.serialNumber, location: data.location,
      status: data.status, oeeTarget: Number(data.oeeTarget),
      capacityPerHour: Number(data.capacityPerHour), unit: data.unit,
      notes: data.notes, isActive: data.isActive === "true",
    };
    if (data.machineId.trim())         body.machineId = data.machineId.trim().toUpperCase();
    if (data.nextMaintenanceDate)      body.nextMaintenanceDate = data.nextMaintenanceDate;
    const res = await machinesApi.create(body);
    if (res.error) return res.error.message;
    setShowCreate(false);
    void load();
    return null;
  }

  async function handleEdit(data: MachineFormData): Promise<string | null> {
    if (!editRecord) return "No record.";
    const body: Record<string, unknown> = {
      name: data.name.trim(), type: data.type.trim(),
      manufacturer: data.manufacturer, model: data.model,
      serialNumber: data.serialNumber, location: data.location,
      status: data.status, oeeTarget: Number(data.oeeTarget),
      capacityPerHour: Number(data.capacityPerHour), unit: data.unit,
      notes: data.notes, isActive: data.isActive === "true",
    };
    if (data.nextMaintenanceDate) body.nextMaintenanceDate = data.nextMaintenanceDate;
    const res = await machinesApi.update(editRecord._id, body);
    if (res.error) return res.error.message;
    setEditRecord(null);
    setDetailRecord(null);
    void load();
    return null;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await machinesApi.delete(deleteTarget._id);
    setDeleting(false);
    if (res.error) setApiError(res.error.message);
    else { setDeleteTarget(null); setEditRecord(null); setDetailRecord(null); void load(); }
  }

  function toForm(m: MachineRecord): MachineFormData {
    return {
      machineId: m.machineId, name: m.name, type: m.type,
      manufacturer: m.manufacturer, model: m.model,
      serialNumber: m.serialNumber, location: m.location,
      status: m.status, oeeTarget: String(m.oeeTarget),
      capacityPerHour: String(m.capacityPerHour), unit: m.unit,
      nextMaintenanceDate: m.nextMaintenanceDate ? m.nextMaintenanceDate.slice(0, 10) : "",
      notes: m.notes, isActive: String(m.isActive),
    };
  }

  return (
    <PageShell
      title="Machines"
      subtitle="Machine register, OEE tracking, service schedules, and breakdown management."
      action={<ActionButton label="+ Register Machine" onClick={() => setShowCreate(true)} />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Operational" value={String(running)}     sub="Running machines"        accent />
        <KpiCard label="Breakdown"   value={String(breakdown)}   sub="Urgent attention"               />
        <KpiCard label="Maintenance" value={String(maintenance)} sub="Under scheduled service"        />
        <KpiCard label="OEE Target"  value={`${avgOee}%`}        sub="Average target"                 />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search machines…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)", minWidth: "220px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid var(--card-border)", borderRadius: "7px", fontSize: "13px", color: "var(--text-h)", background: "var(--card-bg)" }}
        >
          <option value="">All Statuses</option>
          <option value="operational">Operational</option>
          <option value="idle">Idle</option>
          <option value="maintenance">Maintenance</option>
          <option value="breakdown">Breakdown</option>
          <option value="decommissioned">Decommissioned</option>
        </select>
      </div>

      {apiError && <ErrorBanner message={apiError} />}

      <SectionCard title="Machine Register" subtitle="All machines and equipment">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>No machines found.</div>
        ) : (
          <DataTable columns={["ID", "Name", "Type", "Model", "Location", "OEE Target", "Next Service", "Status", ""]}>
            {filtered.map((m, idx) => (
              <DataRow
                key={m._id}
                index={idx}
                cells={[
                  <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)", cursor: "pointer" }} onClick={() => setDetailRecord(m)}>{m.machineId}</span>,
                  <span style={{ cursor: "pointer" }} onClick={() => setDetailRecord(m)}>{m.name}</span>,
                  m.type,
                  m.model || "—",
                  m.location || "—",
                  <OeeBar pct={m.oeeTarget} status={m.status} />,
                  m.nextMaintenanceDate ? m.nextMaintenanceDate.slice(0, 10) : "—",
                  <StatusPill label={STATUS_LABEL[m.status] ?? m.status} variant={STATUS_VARIANT[m.status] ?? "neutral"} />,
                  <button
                    onClick={() => setEditRecord(m)}
                    style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "5px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "var(--text)" }}
                  >Edit</button>,
                ]}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      <Modal open={showCreate} title="Register Machine" onClose={() => setShowCreate(false)} width={640}>
        <MachineForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={!!editRecord} title={`Edit Machine — ${editRecord?.name ?? ""}`} onClose={() => setEditRecord(null)} width={640}>
        {editRecord && (
          <MachineForm
            initial={toForm(editRecord)}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            onDelete={() => setDeleteTarget(editRecord)}
            isEdit
          />
        )}
      </Modal>

      <Modal open={!!detailRecord && !editRecord} title={detailRecord?.name ?? ""} onClose={() => setDetailRecord(null)} width={500}>
        {detailRecord && (
          <div>
            <DR label="Machine ID"      value={detailRecord.machineId} />
            <DR label="Name"            value={detailRecord.name} />
            <DR label="Type"            value={detailRecord.type} />
            <DR label="Manufacturer"    value={detailRecord.manufacturer} />
            <DR label="Model"           value={detailRecord.model} />
            <DR label="Serial Number"   value={detailRecord.serialNumber} />
            <DR label="Location"        value={detailRecord.location} />
            <DR label="Status"          value={STATUS_LABEL[detailRecord.status] ?? detailRecord.status} />
            <DR label="OEE Target"      value={`${detailRecord.oeeTarget}%`} />
            <DR label="Capacity/Hour"   value={`${detailRecord.capacityPerHour} ${detailRecord.unit}`} />
            <DR label="Next Maint."     value={detailRecord.nextMaintenanceDate?.slice(0, 10) ?? "—"} />
            <DR label="Last Maint."     value={detailRecord.lastMaintenanceDate?.slice(0, 10) ?? "—"} />
            <DR label="Downtime Hours"  value={String(detailRecord.totalDowntimeHours)} />
            <DR label="Notes"           value={detailRecord.notes} />
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
        title="Delete Machine"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </PageShell>
  );
}
