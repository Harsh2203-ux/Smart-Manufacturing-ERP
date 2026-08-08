/**
 * components/charts/LineChart.tsx
 * Pure SVG responsive area/line chart — supports single or dual series.
 */
import type { ChartPoint } from "../../types/dashboard";

interface LineChartProps {
  data: ChartPoint[];
  color?: string;
  color2?: string;
  height?: number;
  label?: string;
  label2?: string;
  formatY?: (v: number) => string;
  showDots?: boolean;
}

export function LineChart({
  data,
  color  = "#3b82f6",
  color2 = "#10b981",
  height = 200,
  label,
  label2,
  formatY = (v) => v.toLocaleString(),
  showDots = true,
}: LineChartProps) {
  const W = 600;
  const H = height;
  const PAD = { top: 20, right: 20, bottom: 36, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const v1 = data.map((d) => d.value);
  const v2 = data.filter((d) => d.value2 !== undefined).map((d) => d.value2 as number);
  const allValues = [...v1, ...v2];
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const range = max - min || 1;
  const hasDual = v2.length > 0;

  const scaleX = (i: number) => PAD.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const scaleY = (v: number) => PAD.top + (1 - (v - min) / range) * chartH;

  const makeLinePts = (vals: number[]) =>
    vals.map((v, i) => `${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(" ");

  const makeArea = (vals: number[]) => {
    const pts = vals.map((v, i) => `L ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`);
    return [
      `M ${scaleX(0).toFixed(1)},${scaleY(vals[0]).toFixed(1)}`,
      ...pts,
      `L ${scaleX(vals.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)}`,
      `L ${PAD.left.toFixed(1)},${(PAD.top + chartH).toFixed(1)}`,
      "Z",
    ].join(" ");
  };

  const yTicks = [0, 1, 2, 3, 4].map((i) => min + (range * i) / 4);
  const gradId1 = `lc1-${color.replace("#", "")}`;
  const gradId2 = `lc2-${color2.replace("#", "")}`;

  // Reduce x-label clutter: show every 2nd on small sets, every 3rd on large
  const labelStep = data.length > 8 ? 2 : 1;

  return (
    <div>
      {/* Legend */}
      {(label || label2) && (
        <div style={{ display: "flex", gap: "16px", marginBottom: "10px", flexWrap: "wrap" }}>
          {label && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "24px", height: "3px", borderRadius: "2px", background: color }} />
              <span style={{ fontSize: "11px", color: "var(--text)", fontWeight: 500 }}>{label}</span>
            </div>
          )}
          {hasDual && label2 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "24px", height: "3px", borderRadius: "2px", background: color2, borderTop: `1.5px dashed ${color2}` }} />
              <span style={{ fontSize: "11px", color: "var(--text)", fontWeight: 500 }}>{label2}</span>
            </div>
          )}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: `${height}px`, display: "block" }} aria-hidden="true">
        <defs>
          <linearGradient id={gradId1} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          {hasDual && (
            <linearGradient id={gradId2} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color2} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color2} stopOpacity="0" />
            </linearGradient>
          )}
        </defs>

        {/* Grid lines + Y labels */}
        {yTicks.map((tick, i) => {
          const y = scaleY(tick);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y}
                stroke="var(--card-border)" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "4 3"} />
              <text x={PAD.left - 8} y={y + 4} textAnchor="end"
                fontSize="9.5" fill="var(--text)" fontFamily="inherit">
                {formatY(tick)}
              </text>
            </g>
          );
        })}

        {/* Area fills */}
        {hasDual && (
          <path d={makeArea(v2)} fill={`url(#${gradId2})`} />
        )}
        <path d={makeArea(v1)} fill={`url(#${gradId1})`} />

        {/* Lines */}
        {hasDual && (
          <polyline points={makeLinePts(v2)} fill="none" stroke={color2}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
        )}
        <polyline points={makeLinePts(v1)} fill="none" stroke={color}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data dots on series 1 */}
        {showDots && v1.map((v, i) => (
          <circle key={i} cx={scaleX(i)} cy={scaleY(v)} r="3"
            fill={color} stroke="var(--card-bg)" strokeWidth="1.5" />
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          (i % labelStep === 0) && (
            <text key={i} x={scaleX(i)} y={H - 6} textAnchor="middle"
              fontSize="9.5" fill="var(--text)" fontFamily="inherit">
              {d.label}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}
