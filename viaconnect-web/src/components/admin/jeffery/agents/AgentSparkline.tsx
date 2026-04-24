// Tiny SVG line for 24 rolled-up snapshots. No dep. Zero-state shows a flat
// line so empty tiles stay visually stable.

export interface AgentSparklineProps {
  values: number[];
  stroke?: string;
  width?: number;
  height?: number;
  ariaLabel?: string;
}

export default function AgentSparkline({
  values,
  stroke = "#2DA5A0",
  width = 80,
  height = 24,
  ariaLabel = "Trend sparkline",
}: AgentSparklineProps) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={stroke} strokeOpacity={0.3} strokeWidth={1} />
      </svg>
    );
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel}>
      <polyline fill="none" stroke={stroke} strokeWidth={1.25} points={points} />
    </svg>
  );
}
