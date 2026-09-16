import './Chart.css';

const WIDTH = 600;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 56 };

// Dependency-free SVG line chart — no charting library installed, and this app only ever
// needs this one shape (a single revenue-over-time series), so a small purpose-built
// component is simpler than pulling in a general-purpose one. Native <title> elements
// give a hover tooltip without any JS positioning logic.
export function SimpleLineChart({ points, formatValue = (v) => String(v), color = 'var(--color-accent)' }) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(1, ...points.map((p) => p.value));

  const coords = points.map((p, i) => ({
    ...p,
    x: PADDING.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
    y: PADDING.top + innerH - (p.value / maxValue) * innerH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  // Thin out x-axis labels so they don't overlap on a wide date range.
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return (
    <svg className="ds-linechart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Line chart">
      {gridLines.map((f) => {
        const y = PADDING.top + innerH * (1 - f);
        return (
          <g key={f}>
            <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className="ds-linechart__grid" />
            <text x={PADDING.left - 8} y={y} className="ds-linechart__axis-label" textAnchor="end" dominantBaseline="middle">
              {formatValue(Math.round(maxValue * f))}
            </text>
          </g>
        );
      })}
      <path d={linePath} className="ds-linechart__line" style={{ stroke: color }} />
      {coords.map((c, i) => (
        <g key={c.date}>
          <circle cx={c.x} cy={c.y} r={3.5} className="ds-linechart__dot" style={{ fill: color }}>
            <title>{`${c.date}: ${formatValue(c.value)}`}</title>
          </circle>
          {(i % labelStep === 0 || i === coords.length - 1) && (
            <text x={c.x} y={HEIGHT - 8} className="ds-linechart__axis-label" textAnchor="middle">
              {c.date.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
