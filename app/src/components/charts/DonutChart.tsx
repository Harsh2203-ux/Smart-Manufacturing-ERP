/**
 * components/charts/DonutChart.tsx
 * Pure SVG donut/pie chart with legend — no external dependencies.
 */

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  label?: string;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arc(cx: number, cy: number, r: number, start: number, end: number, thickness: number) {
  const s = polarToXY(cx, cy, r, start);
  const e = polarToXY(cx, cy, r, end);
  const si = polarToXY(cx, cy, r - thickness, start);
  const ei = polarToXY(cx, cy, r - thickness, end);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${s.x.toFixed(2)} ${s.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`,
    `L ${ei.x.toFixed(2)} ${ei.y.toFixed(2)}`,
    `A ${r - thickness} ${r - thickness} 0 ${large} 0 ${si.x.toFixed(2)} ${si.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function DonutChart({ data, size = 160, thickness = 36, label }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r  = (size / 2) - 4;

  let current = 0;
  const segments = data.map((d) => {
    const start = current;
    const sweep = (d.value / total) * 360;
    current += sweep;
    return { ...d, start, end: current };
  });

  return (
    <div>
      {label && (
        <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: "8px", fontWeight: 500 }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{ flexShrink: 0 }} aria-hidden="true">
          {segments.map((seg) => (
            <path key={seg.label} d={arc(cx, cy, r, seg.start, seg.end, thickness)}
              fill={seg.color} style={{ transition: "opacity 0.15s" }} />
          ))}
          {/* Center total */}
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="14" fontWeight="700"
            fill="var(--text-h)" fontFamily="inherit">
            {total.toLocaleString()}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text)"
            fontFamily="inherit">
            TOTAL
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
          {data.map((d) => (
            <div key={d.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "10px", height: "10px", borderRadius: "2px",
                background: d.color, flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: "var(--text-h)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {d.label}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text)" }}>
                  {d.value}% · {Math.round((d.value / total) * 100)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
