/**
 * components/charts/GaugeBar.tsx
 * Semi-circular SVG gauge for OEE / efficiency KPIs.
 */

interface GaugeBarProps {
  value: number; // 0–100
  color?: string;
  size?: number;
  label?: string;
  sublabel?: string;
}

export function GaugeBar({
  value,
  color = "#3b82f6",
  size = 120,
  label,
  sublabel,
}: GaugeBarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.42;
  const stroke = size * 0.09;
  // Arc spans 180° (half circle, left to right)
  const startAngle = -180;
  const endAngle   = 0;
  const sweep = ((value / 100) * 180);

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  const start = polarToXY(startAngle, r);
  const trackEnd = polarToXY(endAngle, r);
  const fillEnd = polarToXY(startAngle + sweep, r);
  const largeArc = sweep > 180 ? 1 : 0;

  const trackPath = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${trackEnd.x.toFixed(2)} ${trackEnd.y.toFixed(2)}`;
  const fillPath  = sweep > 0
    ? `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(2)} ${fillEnd.y.toFixed(2)}`
    : "";

  // Color band: green ≥ 85, amber ≥ 65, red < 65
  const resolvedColor = value >= 85 ? "#10b981" : value >= 65 ? "#f59e0b" : "#ef4444";
  const activeColor = color === "#3b82f6" ? resolvedColor : color;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} aria-hidden="true">
        {/* Track */}
        <path d={trackPath} fill="none" stroke="var(--card-border)" strokeWidth={stroke}
          strokeLinecap="round" />
        {/* Fill */}
        {fillPath && (
          <path d={fillPath} fill="none" stroke={activeColor} strokeWidth={stroke}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s" }} />
        )}
        {/* Value text */}
        <text x={cx} y={size * 0.52} textAnchor="middle" fontSize={size * 0.16}
          fontWeight="700" fill="var(--text-h)" fontFamily="inherit">
          {value.toFixed(1)}%
        </text>
      </svg>
      {label && (
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-h)", marginTop: "4px", textAlign: "center" }}>
          {label}
        </div>
      )}
      {sublabel && (
        <div style={{ fontSize: "10px", color: "var(--text)", marginTop: "2px", textAlign: "center" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}
