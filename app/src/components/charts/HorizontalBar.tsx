/**
 * components/charts/HorizontalBar.tsx
 * Horizontal progress-bar chart for machine utilization.
 */

interface HBarSegment {
  label: string;
  value: number; // 0–100 percent
  color: string;
}

interface HorizontalBarProps {
  data: HBarSegment[];
  label?: string;
}

export function HorizontalBar({ data, label }: HorizontalBarProps) {
  return (
    <div>
      {label && (
        <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: "8px", fontWeight: 500 }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {data.map((d) => (
          <div key={d.label}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}>
              <span style={{ fontSize: "12px", color: "var(--text-h)", fontWeight: 500 }}>
                {d.label}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text)", fontWeight: 600 }}>
                {d.value}%
              </span>
            </div>
            <div style={{
              height: "8px",
              borderRadius: "4px",
              background: "var(--card-border)",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                borderRadius: "4px",
                width: `${d.value}%`,
                background: d.color,
                transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
