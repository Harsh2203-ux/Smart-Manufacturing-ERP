/**
 * components/ui/Card.tsx
 * Reusable card container used across all dashboard widgets.
 */
import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  /** Additional header content rendered in top-right slot */
  headerRight?: ReactNode;
  /** Card title */
  title?: string;
  /** Subtitle below title */
  subtitle?: string;
  /** Remove default padding from body */
  noPadding?: boolean;
  /** Highlight left border with accent */
  accent?: string;
}

export function Card({
  children, style, title, subtitle, headerRight, noPadding = false, accent,
}: CardProps) {
  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--card-border)",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "var(--shadow-sm)",
      borderLeft: accent ? `4px solid ${accent}` : undefined,
      ...style,
    }}>
      {(title || headerRight) && (
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--card-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          <div>
            {title && (
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-h)" }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: "11px", color: "var(--text)", marginTop: "2px" }}>
                {subtitle}
              </div>
            )}
          </div>
          {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
        </div>
      )}
      <div style={noPadding ? undefined : { padding: "20px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Minimal section label used inside cards ──────────────────────────────────
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: "11px", fontWeight: 700, color: "var(--text)",
      textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "12px",
    }}>
      {children}
    </div>
  );
}
