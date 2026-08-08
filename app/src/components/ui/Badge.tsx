/**
 * components/ui/Badge.tsx
 * Status badge used in tables and cards.
 */

export type BadgeVariant =
  | "success" | "warning" | "error" | "info"
  | "planned" | "in-progress" | "completed" | "on-hold" | "cancelled"
  | "draft" | "confirmed" | "received"
  | "new" | "processing" | "shipped" | "delivered"
  | "overdue" | "due-soon" | "scheduled"
  | "operational" | "degraded" | "down"
  | "high" | "medium" | "low";

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  success:     { bg: "var(--success-bg)",                  color: "var(--success-text)"  },
  warning:     { bg: "var(--warning-bg)",                  color: "var(--warning-text)"  },
  error:       { bg: "var(--error-bg)",                    color: "var(--error-text)"    },
  info:        { bg: "rgba(59,130,246,0.12)",              color: "#2563eb"              },
  planned:     { bg: "rgba(100,116,139,0.12)",             color: "#475569"              },
  "in-progress":{ bg: "rgba(245,158,11,0.12)",             color: "#b45309"              },
  completed:   { bg: "rgba(16,185,129,0.12)",              color: "#065f46"              },
  "on-hold":   { bg: "rgba(99,102,241,0.12)",              color: "#4338ca"              },
  cancelled:   { bg: "rgba(239,68,68,0.12)",               color: "#b91c1c"              },
  draft:       { bg: "rgba(100,116,139,0.12)",             color: "#475569"              },
  confirmed:   { bg: "rgba(59,130,246,0.12)",              color: "#1d4ed8"              },
  received:    { bg: "rgba(16,185,129,0.12)",              color: "#065f46"              },
  new:         { bg: "rgba(59,130,246,0.12)",              color: "#1d4ed8"              },
  processing:  { bg: "rgba(245,158,11,0.12)",              color: "#b45309"              },
  shipped:     { bg: "rgba(99,102,241,0.12)",              color: "#4338ca"              },
  delivered:   { bg: "rgba(16,185,129,0.12)",              color: "#065f46"              },
  overdue:     { bg: "var(--error-bg)",                    color: "var(--error-text)"    },
  "due-soon":  { bg: "var(--warning-bg)",                  color: "var(--warning-text)"  },
  scheduled:   { bg: "rgba(59,130,246,0.12)",              color: "#2563eb"              },
  operational: { bg: "rgba(16,185,129,0.12)",              color: "#065f46"              },
  degraded:    { bg: "var(--warning-bg)",                  color: "var(--warning-text)"  },
  down:        { bg: "var(--error-bg)",                    color: "var(--error-text)"    },
  high:        { bg: "var(--error-bg)",                    color: "var(--error-text)"    },
  medium:      { bg: "var(--warning-bg)",                  color: "var(--warning-text)"  },
  low:         { bg: "rgba(100,116,139,0.12)",             color: "#475569"              },
};

/** Convert raw strings like "In Progress" → "in-progress" */
export function toBadgeVariant(raw: string): BadgeVariant {
  const key = raw.toLowerCase().replace(/\s+/g, "-") as BadgeVariant;
  return key in BADGE_STYLES ? key : "info";
}

interface BadgeProps {
  variant?: BadgeVariant;
  label?: string;
  children?: React.ReactNode;
}

export function Badge({ variant = "info", label, children }: BadgeProps) {
  const s = BADGE_STYLES[variant];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 9px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      letterSpacing: "0.3px",
      whiteSpace: "nowrap",
    }}>
      {label ?? children}
    </span>
  );
}
