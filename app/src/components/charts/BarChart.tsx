/**
 * components/charts/BarChart.tsx
 * Pure SVG bar chart — no external dependencies.
 */
import type { ChartPoint } from "../../types/dashboard";

interface BarChartProps {
  data: ChartPoint[];
  color?: string;
  height?: number;
  label?: string;
  formatY?: (v: number) => string;
}

export function BarChart({
  data,
  color = "#3b82f6",
  height = 180,
  label,
  formatY = (v) => v.toLocaleString(),
}: BarChartProps) {
  const W = 600;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 32, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const max = Math.max(...values);

  const barWidth  = (chartW / data.length) * 0.6;
  const barGap    = chartW / data.length;

  const scaleY = (v: number) => PAD.top + (1 - v / max) * chartH;
  const barH   = (v: number) => (v / max) * chartH;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const gradId = `bc-${color.replace("#", "")}`;

  return (
    <div>
      {label && (
        <div style={{ fontSize: "12px", color: "var(--text)", marginBottom: "8px", fontWeight: 500 }}>
          {label}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: `${height}px`, display: "block" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = scaleY(tick);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y}
                stroke="var(--card-border)" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "4 4"} />
              {i > 0 && (
                <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                  fontSize="10" fill="var(--text)" fontFamily="inherit">
                  {formatY(tick)}
                </text>
              )}
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const cx  = PAD.left + i * barGap + barGap / 2;
          const bx  = cx - barWidth / 2;
          const by  = scaleY(d.value);
          const bh  = barH(d.value);
          return (
            <g key={i}>
              <rect x={bx} y={by} width={barWidth} height={bh}
                rx="3" fill={`url(#${gradId})`} />
              <text x={cx} y={H - 6} textAnchor="middle"
                fontSize="10" fill="var(--text)" fontFamily="inherit">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
