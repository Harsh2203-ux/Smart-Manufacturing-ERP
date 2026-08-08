// ─── StatusPill ────────────────────────────────────────────────────────────────
// Generic coloured pill badge used in every ERP table.

interface StatusPillProps {
  label: string;
  variant: "success" | "warning" | "error" | "info" | "neutral";
}

const PILL_STYLES: Record<
  StatusPillProps["variant"],
  { bg: string; color: string }
> = {
  success: { bg: "var(--success-bg)",  color: "var(--success-text)" },
  warning: { bg: "var(--warning-bg)",  color: "var(--warning-text)" },
  error:   { bg: "var(--error-bg)",    color: "var(--error-text)"   },
  info:    { bg: "var(--brand-100)",   color: "var(--brand-800)"    },
  neutral: { bg: "var(--table-head-bg)", color: "var(--text)"       },
};

export function StatusPill({ label, variant }: StatusPillProps) {
  const { bg, color } = PILL_STYLES[variant];
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: bg,
        color,
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ─── ActionButton ──────────────────────────────────────────────────────────────
// Small branded button used for primary page actions (New Work Order, etc.)

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
}

export function ActionButton({ label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--accent)",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        padding: "9px 18px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.1px",
      }}
    >
      {label}
    </button>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
// White card with optional header used to group page content.

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function SectionCard({ title, subtitle, children, style }: SectionCardProps) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "10px",
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || subtitle) && (
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--card-border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            {title && (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--text-h)",
                }}
              >
                {title}
              </span>
            )}
            {subtitle && (
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--text)",
                  marginLeft: "8px",
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── DataTable ─────────────────────────────────────────────────────────────────
// Generic scrollable data table.

interface DataTableProps {
  columns: string[];
  children: React.ReactNode;
}

export function DataTable({ columns, children }: DataTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
      >
        <thead>
          <tr style={{ background: "var(--table-head-bg)", textAlign: "left" }}>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  padding: "10px 20px",
                  fontWeight: 600,
                  color: "var(--text)",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderBottom: "1px solid var(--card-border)",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─── DataRow ──────────────────────────────────────────────────────────────────

interface DataRowProps {
  cells: React.ReactNode[];
  index: number;
}

export function DataRow({ cells, index }: DataRowProps) {
  return (
    <tr
      style={{
        background: index % 2 === 0 ? "transparent" : "var(--table-stripe-bg)",
      }}
    >
      {cells.map((cell, i) => (
        <td
          key={i}
          style={{
            padding: "13px 20px",
            color: i === 0 ? "var(--text-h)" : "var(--text)",
            fontWeight: i === 0 ? 500 : 400,
            borderBottom: "1px solid var(--card-border)",
            whiteSpace: "nowrap",
          }}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div
      style={{
        background: accent ? "var(--accent)" : "var(--card-bg)",
        border: `1px solid ${accent ? "transparent" : "var(--card-border)"}`,
        borderRadius: "10px",
        padding: "22px 24px",
        flex: "1 1 160px",
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: accent ? "rgba(255,255,255,0.75)" : "var(--text)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "26px",
          fontWeight: 700,
          color: accent ? "#fff" : "var(--text-h)",
          letterSpacing: "-0.5px",
          marginBottom: sub ? "4px" : 0,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "12px",
            color: accent ? "rgba(255,255,255,0.65)" : "var(--text)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
