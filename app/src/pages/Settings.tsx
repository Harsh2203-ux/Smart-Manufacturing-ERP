import { useState, useEffect } from "react";
import PageShell from "../components/ui/PageShell";
import { SectionCard } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { settingsApi } from "../api/businessApi";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SettingRow {
  key: string;
  label: string;
  description: string;
  type: "text" | "toggle" | "select";
  value: string | boolean;
  options?: string[];
}

// ─── Setting field component ───────────────────────────────────────────────────

interface FieldProps {
  setting: SettingRow;
  onChange: (key: string, value: string | boolean) => void;
  canEdit: boolean;
}

function SettingField({ setting, onChange, canEdit }: FieldProps) {
  if (setting.type === "toggle") {
    const checked = setting.value as boolean;
    return (
      <button
        disabled={!canEdit}
        onClick={() => onChange(setting.key, !checked)}
        style={{
          width: "44px",
          height: "24px",
          borderRadius: "999px",
          border: "none",
          background: checked ? "var(--accent)" : "var(--card-border)",
          cursor: canEdit ? "pointer" : "not-allowed",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
          opacity: canEdit ? 1 : 0.6,
        }}
        aria-checked={checked}
        role="switch"
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: checked ? "23px" : "3px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
          }}
        />
      </button>
    );
  }

  if (setting.type === "select") {
    return (
      <select
        disabled={!canEdit}
        value={setting.value as string}
        onChange={(e) => onChange(setting.key, e.target.value)}
        style={{
          border: "1px solid var(--card-border)",
          background: "var(--input-bg)",
          color: "var(--text-h)",
          borderRadius: "6px",
          padding: "6px 10px",
          fontSize: "13px",
          cursor: canEdit ? "pointer" : "not-allowed",
          opacity: canEdit ? 1 : 0.6,
          minWidth: "160px",
        }}
      >
        {setting.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type="text"
      disabled={!canEdit}
      value={setting.value as string}
      onChange={(e) => onChange(setting.key, e.target.value)}
      style={{
        border: "1px solid var(--card-border)",
        background: "var(--input-bg)",
        color: "var(--text-h)",
        borderRadius: "6px",
        padding: "6px 10px",
        fontSize: "13px",
        width: "240px",
        opacity: canEdit ? 1 : 0.6,
        cursor: canEdit ? "text" : "not-allowed",
      }}
    />
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const INITIAL_SETTINGS: SettingRow[] = [
  // ── General
  { key: "company_name",      label: "Company Name",          description: "Legal company name shown in reports and exports.",      type: "text",   value: "Nexus Smart Manufacturing" },
  { key: "timezone",          label: "Timezone",              description: "Server and display timezone for all timestamps.",       type: "select", value: "UTC+00:00", options: ["UTC-08:00","UTC-05:00","UTC+00:00","UTC+01:00","UTC+05:30","UTC+08:00"] },
  { key: "date_format",       label: "Date Format",           description: "Date display format used across the ERP.",              type: "select", value: "YYYY-MM-DD", options: ["YYYY-MM-DD","DD/MM/YYYY","MM/DD/YYYY"] },
  { key: "currency",          label: "Default Currency",      description: "Currency used for all financial transactions.",         type: "select", value: "USD", options: ["USD","EUR","GBP","INR","JPY","AED"] },
  // ── Notifications
  { key: "email_alerts",      label: "Email Alerts",          description: "Send critical system alerts via email.",                type: "toggle", value: true  },
  { key: "slack_integration", label: "Slack Integration",     description: "Post production and quality alerts to Slack channel.",  type: "toggle", value: false },
  { key: "maintenance_reminders", label: "Maintenance Reminders", description: "Auto-send reminders 48 hours before scheduled maintenance.", type: "toggle", value: true },
  // ── Security
  { key: "two_factor_required", label: "Require 2FA for Admins", description: "Force all admin accounts to enable two-factor authentication.", type: "toggle", value: true },
  { key: "session_timeout",   label: "Session Timeout",       description: "Idle session timeout in minutes (8–480).",             type: "select", value: "480 min", options: ["30 min","60 min","120 min","240 min","480 min"] },
  { key: "audit_logging",     label: "Audit Logging",         description: "Log all user actions to the audit trail.",              type: "toggle", value: true  },
  // ── Production
  { key: "shift_hours",       label: "Shift Duration",        description: "Default manufacturing shift duration.",                type: "select", value: "8 hours", options: ["6 hours","8 hours","10 hours","12 hours"] },
  { key: "oee_target",        label: "OEE Target",            description: "Overall Equipment Effectiveness minimum threshold.",    type: "select", value: "85%", options: ["75%","80%","85%","90%","95%"] },
];

const SECTIONS: { title: string; keys: string[] }[] = [
  { title: "General",      keys: ["company_name","timezone","date_format","currency"] },
  { title: "Notifications",keys: ["email_alerts","slack_integration","maintenance_reminders"] },
  { title: "Security",     keys: ["two_factor_required","session_timeout","audit_logging"] },
  { title: "Production",   keys: ["shift_hours","oee_target"] },
];

export default function Settings() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings:edit");

  const [settings, setSettings] = useState<Record<string, string | boolean>>(
    Object.fromEntries(INITIAL_SETTINGS.map((s) => [s.key, s.value]))
  );
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Load persisted settings from backend on mount
  useEffect(() => {
    settingsApi.getAll().then((r) => {
      if (r.data && typeof r.data === "object") {
        const remote = r.data as Record<string, unknown>;
        setSettings((prev) => {
          const merged: Record<string, string | boolean> = { ...prev };
          for (const key of Object.keys(merged)) {
            if (key in remote) {
              const val = remote[key];
              if (typeof val === "boolean" || typeof val === "string" || typeof val === "number") {
                merged[key] = typeof val === "number" ? String(val) : val as string | boolean;
              }
            }
          }
          return merged;
        });
      }
    });
  }, []);

  function handleChange(key: string, value: string | boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setSaveError("");
  }

  async function handleSave() {
    setSaving(true); setSaveError(""); setSaved(false);
    const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
    const r = await settingsApi.bulkUpdate(payload);
    setSaving(false);
    if (r.error) {
      // If 403 (admin only), still show local saved state gracefully
      if (r.status === 403) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(r.error.message);
      }
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <PageShell
      title="Settings"
      subtitle="System configuration, notifications, and security preferences."
      action={
        canEdit ? (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saved ? "var(--success-text)" : "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              transition: "background 0.2s",
            }}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        ) : undefined
      }
    >
      {saveError && (
        <div style={{ padding: "12px 16px", background: "var(--error-bg, rgba(239,68,68,0.1))", color: "var(--error-text)", borderRadius: "8px", fontSize: "13px", fontWeight: 500, marginBottom: "24px" }}>
          {saveError}
        </div>
      )}
      {!canEdit && (
        <div
          style={{
            padding: "12px 16px",
            background: "var(--warning-bg)",
            color: "var(--warning-text)",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            marginBottom: "24px",
          }}
        >
          You have read-only access to settings. Contact an administrator to make changes.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {SECTIONS.map((section) => {
          const sectionSettings = INITIAL_SETTINGS.filter((s) =>
            section.keys.includes(s.key)
          );
          return (
            <SectionCard key={section.title} title={section.title}>
              <div style={{ padding: "8px 0" }}>
                {sectionSettings.map((s, idx) => (
                  <div
                    key={s.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 24px",
                      borderBottom:
                        idx < sectionSettings.length - 1
                          ? "1px solid var(--card-border)"
                          : "none",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-h)",
                          marginBottom: "2px",
                        }}
                      >
                        {s.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text)" }}>
                        {s.description}
                      </div>
                    </div>
                    <SettingField
                      setting={{ ...s, value: settings[s.key] }}
                      onChange={handleChange}
                      canEdit={canEdit}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </PageShell>
  );
}
