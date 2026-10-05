/** Tiny trend line; colour follows the overall direction (up green, down red, flat muted). */
export function Sparkline({ values, width = 72, height = 22, label }: { values: number[]; width?: number; height?: number; label?: string }) {
  if (values.length < 2) return <span className="inline-block" style={{ width, height }} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const change = values[values.length - 1] / values[0] - 1;
  const color = Math.abs(change) < 0.005 ? "var(--muted)" : change > 0 ? "var(--flag-green)" : "var(--flag-red)";
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={color} fillOpacity={0.12} className="fade-late" />
      <path d={d} pathLength={1} className="draw" fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.25} fill={color} className="fade-late" />
    </svg>
  );
}
