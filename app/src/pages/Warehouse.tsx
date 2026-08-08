import { useState, useEffect, useCallback } from "react";
import PageShell from "../components/ui/PageShell";
import { ActionButton, DataRow, DataTable, KpiCard, SectionCard, StatusPill } from "../components/ui";
import { Modal, FormField, NativeInput as Input, NativeSelect as Select, NativeTextarea as Textarea, FormGrid, FormActions, ErrorBanner, ConfirmDialog } from "../components/ui/Modal";
import { warehouseApi } from "../api/manufacturingApi";
import type { WarehouseRecord } from "../api/manufacturingApi";

const STATUS_LABEL: Record<string, string> = {
  operational: "Operational", maintenance: "Maintenance", full: "Full", closed: "Closed",
};
const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  operational: "success", maintenance: "warning", full: "error", closed: "neutral",
};
const TYPE_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  storage: "info", receiving: "success", dispatch: "neutral", quality_hold: "warning", production_staging: "error",
};
const TEMP_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  ambient: "neutral", cold: "info", frozen: "error", controlled: "warning",
};

function CapacityBar({ used, total }: { used: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((used / total) * 100);
  const color = pct >= 95 ? "var(--error-text)" : pct >= 75 ? "var(--warning-text)" : "var(--success-text)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "80px", height: "6px", borderRadius: "999px", background: "var(--card-border)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "999px" }} />
      </div>
      <span style={{ fontSize: "11px", color: "var(--text)", minWidth: "32px" }}>{pct}%</span>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface WHFormData {
  code: string; name: string; zone: string; type: string;
  aisles: string; racks: string; totalSlots: string; usedSlots: string;
  manager: string; temperature: string; status: string; notes: string;
}

const DEFAULT_FORM: WHFormData = {
  code: "", name: "", zone: "", type: "storage",
  aisles: "0", racks: "0", totalSlots: "0", usedSlots: "0",
  manager: "", temperature: "ambient", status: "operational", notes: "",
};

function WHForm({
  initial = DEFAULT_FORM, onSave, onCancel, onDelete, isEdit,
}: {
  initial?: WHFormData;
  onSave: (d: WHFormData) => Promise<string | null>;
  onCancel: () => void; onDelete?: () => void; isEdit?: boolean;
}) {
  const [form, setForm] = useState<WHFormData>(initial);
  const [errors, setErrors] = useState<Partial<WHFormData>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set(field: keyof WHFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<WHFormData> = {};
    if (!form.code.trim()) e.code = "Code is required.";
    if (!form.name.trim()) e.name = "Name is required.";
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
        <FormField label="Warehouse Code" required error={errors.code}>
          <Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="e.g. WH-MAIN-A" />
        </FormField>
        <FormField label="Name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Main Warehouse Zone A" />
        </FormField>
        <FormField label="Zone">
          <Input value={form.zone} onChange={(e) => set("zone", e.target.value)} placeholder="e.g. A" />
        </FormField>
        <FormField label="Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="storage">Storage</option>
            <option value="receiving">Receiving</option>
            <option value="dispatch">Dispatch</option>
            <option value="quality_hold">Quality Hold</option>
            <option value="production_staging">Production Staging</option>
          </Select>
        </FormField>
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="full">Full</option>
            <option value="closed">Closed</option>
          </Select>
        </FormField>
        <FormField label="Temperature">
          <Select value={form.temperature} onChange={(e) => set("temperature", e.target.value)}>
            <option value="ambient">Ambient</option>
            <option value="cold">Cold</option>
            <option value="frozen">Frozen</option>
            <option value="controlled">Controlled</option>
          </Select>
        </FormField>
        <FormField label="Aisles">
          <Input type="number" min="0" value={form.aisles} onChange={(e) => set("aisles", e.target.value)} />
        </FormField>
        <FormField label="Racks">
          <Input type="number" min="0" value={form.racks} onChange={(e) => set("racks", e.target.value)} />
        </FormField>
        <FormField label="Total Slots">
          <Input type="number" min="0" value={form.totalSlots} onChange={(e) => set("totalSlots", e.target.value)} />
        </FormField>
        <FormField label="Used Slots">
          <Input type="number" min="0" value={form.usedSlots} onChange={(e) => set("usedSlots", e.target.value)} />
        </FormField>
        <FormField label="Manager">
          <Input value={form.manager} onChange={(e) => set("manager", e.target.value)} placeholder="e.g. D. Okafor" />
        </FormField>
      </FormGrid>
      <FormField label="Notes">
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </FormField>
      <FormActions
        onCancel={onCancel}
        submitLabel={isEdit ? "Update Location" : "Add Location"}
        loading={saving}
        destructive={isEdit}
        onDestruct={onDelete}
        destructLabel="Delete Location"
      />
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Warehouse() {
  const [records, setRecords]   = useState<WarehouseRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editRecord, setEditRecord] = useState<WarehouseRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    const params: Record<string, string> = { limit: "200" };
    if (statusFilter) params.status = statusFilter;
    const res = await warehouseApi.list(params);
    if (res.error) setApiError(res.error.message);
    else setRecords(res.data ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const filtered = records.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.zone.toLowerCase().includes(q);
  });

  const operational = records.filter((l) => l.status === "operational").length;
  const full        = records.filter((l) => l.status === "full").length;
  const totalSlots  = records.reduce((a, l) => a + l.totalSlots, 0);
  const usedSlots   = records.reduce((a, l) => a + l.usedSlots, 0);
  const utilPct     = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0;

  async function handleCreate(data: WHFormData): Promise<string | null> {
    const res = await warehouseApi.create({
      code: data.code.trim().toUpperCase(), name: data.name.trim(),
      zone: data.zone, type: data.type, status: data.status, temperature: data.temperature,
      aisles: Number(data.aisles), racks: Number(data.racks),
      totalSlots: Number(data.totalSlots), usedSlots: Number(data.usedSlots),
      manager: data.manager, notes: data.notes,
    });
    if (res.error) return res.error.message;
    setShowCreate(false);
    void load();
    return null;
  }

  async function handleEdit(data: WHFormData): Promise<string | null> {
    if (!editRecord) return "No record.";
    const res = await warehouseApi.update(editRecord._id, {
      code: data.code.trim().toUpperCase(), name: data.name.trim(),
      zone: data.zone, type: data.type, status: data.status, temperature: data.temperature,
      aisles: Number(data.aisles), racks: Number(data.racks),
      totalSlots: Number(data.totalSlots), usedSlots: Number(data.usedSlots),
      manager: data.manager, notes: data.notes,
    });
    if (res.error) return res.error.message;
    setEditRecord(null);
    void load();
    return null;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await warehouseApi.delete(deleteTarget._id);
    setDeleting(false);
    if (res.error) setApiError(res.error.message);
    else { setDeleteTarget(null); setEditRecord(null); void load(); }
  }

  function toForm(r: WarehouseRecord): WHFormData {
    return {
      code: r.code, name: r.name, zone: r.zone, type: r.type,
      aisles: String(r.aisles), racks: String(r.racks),
      totalSlots: String(r.totalSlots), usedSlots: String(r.usedSlots),
      manager: r.manager, temperature: r.temperature, status: r.status, notes: r.notes,
    };
  }

  return (
    <PageShell
      title="Warehouse"
      subtitle="Warehouse zones, storage locations, capacity, and stock movement."
      action={<ActionButton label="+ Add Location" onClick={() => setShowCreate(true)} />}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <KpiCard label="Operational Zones" value={String(operational)} sub="Active & ready"       accent />
        <KpiCard label="Full Zones"         value={String(full)}        sub="At capacity"                />
        <KpiCard label="Total Slots"        value={totalSlots.toLocaleString()} sub="Across all zones"   />
        <KpiCard label="Utilization"        value={`${utilPct}%`}       sub={`${usedSlots.toLocaleString()} used`} />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input
          placeholder="Search warehouses…"
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
          <option value="maintenance">Maintenance</option>
          <option value="full">Full</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {apiError && <ErrorBanner message={apiError} />}

      <SectionCard title="Warehouse Locations" subtitle="All zones and storage areas">
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text)" }}>No warehouse locations found.</div>
        ) : (
          <DataTable columns={["Code", "Name", "Zone", "Type", "Aisles", "Racks", "Total Slots", "Utilization", "Manager", "Temp.", "Status", ""]}>
            {filtered.map((loc, idx) => (
              <DataRow
                key={loc._id}
                index={idx}
                cells={[
                  <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--accent)" }}>{loc.code}</span>,
                  loc.name,
                  <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>{loc.zone}</span>,
                  <StatusPill label={loc.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} variant={TYPE_VARIANT[loc.type] ?? "neutral"} />,
                  loc.aisles.toString(),
                  loc.racks.toString(),
                  loc.totalSlots.toLocaleString(),
                  <CapacityBar used={loc.usedSlots} total={loc.totalSlots} />,
                  loc.manager,
                  <StatusPill label={loc.temperature.charAt(0).toUpperCase() + loc.temperature.slice(1)} variant={TEMP_VARIANT[loc.temperature] ?? "neutral"} />,
                  <StatusPill label={STATUS_LABEL[loc.status] ?? loc.status} variant={STATUS_VARIANT[loc.status] ?? "neutral"} />,
                  <button
                    onClick={() => setEditRecord(loc)}
                    style={{ background: "none", border: "1px solid var(--card-border)", borderRadius: "5px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "var(--text)" }}
                  >Edit</button>,
                ]}
              />
            ))}
          </DataTable>
        )}
      </SectionCard>

      <Modal open={showCreate} title="Add Warehouse Location" onClose={() => setShowCreate(false)} width={640}>
        <WHForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      </Modal>

      <Modal open={!!editRecord} title={`Edit Location — ${editRecord?.name ?? ""}`} onClose={() => setEditRecord(null)} width={640}>
        {editRecord && (
          <WHForm
            initial={toForm(editRecord)}
            onSave={handleEdit}
            onCancel={() => setEditRecord(null)}
            onDelete={() => setDeleteTarget(editRecord)}
            isEdit
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Location"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </PageShell>
  );
}
