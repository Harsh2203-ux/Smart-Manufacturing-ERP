import type { ReactNode } from "react";

interface PageShellProps {
  /** Large page heading */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Right-aligned slot — pass a button or action row */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Consistent page wrapper used by every ERP section page.
 * Renders: page header (title + subtitle + action slot) → children.
 */
export default function PageShell({
  title,
  subtitle,
  action,
  children,
}: PageShellProps) {
  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "28px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--text-h)",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                marginTop: "4px",
                fontSize: "13px",
                color: "var(--text)",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {children}
    </div>
  );
}
