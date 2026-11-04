import './Chart.css';

const WIDTH = 600;
const HEIGHT = 200;
const PADDING = { top: 24, right: 12, bottom: 28, left: 12 };

// Single-series bar chart for a small fixed number of periods (the Business Growth
// panel's "last 8 weeks/months/years" trend) — unlike SimpleBarChart, this draws one bar
// per point (not grouped series), labels every bar (never just one in seven — 8 is few
// enough to fit), prints the value above each bar the way the reference dashboard does,
// and draws the current (still-in-progress) period in a visually distinct color from the
// completed ones.
export function PeriodBarChart({ points, formatValue = String, formatLabel = (p) => p.periodStart }) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(1, ...points.map((p) => p.value));

  const groupWidth = innerW / points.length;
  const barWidth = Math.min(44, groupWidth * 0.6);

  return (
    <svg className="ds-barchart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Bar chart">
      <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={PADDING.top + innerH} y2={PADDING.top + innerH} className="ds-barchart__axis" />
      {points.map((p, i) => {
        const groupX = PADDING.left + i * groupWidth + groupWidth / 2;
        const barHeight = (p.value / maxValue) * innerH;
        const x = groupX - barWidth / 2;
        const y = PADDING.top + innerH - barHeight;
        return (
          <g key={p.periodStart}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, p.value > 0 ? 2 : 0)}
              rx={3}
              className={`ds-periodbar${p.isCurrent ? ' ds-periodbar--current' : ''}`}
            >
              <title>{`${formatLabel(p)}: ${formatValue(p.value)}`}</title>
            </rect>
            <text x={groupX} y={y - 6} className="ds-barchart__value-label" textAnchor="middle">
              {formatValue(p.value)}
            </text>
            <text x={groupX} y={HEIGHT - PADDING.bottom + 16} className="ds-barchart__axis-label" textAnchor="middle">
              {formatLabel(p)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
