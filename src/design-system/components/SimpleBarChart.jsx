import './Chart.css';

const WIDTH = 600;
const HEIGHT = 240;
const PADDING = { top: 16, right: 16, bottom: 44, left: 32 };

// Dependency-free grouped-bar SVG chart, purpose-built for the bookings trend (a small
// fixed set of series — booked/cancelled/completed) rather than a general charting lib.
export function SimpleBarChart({ points, series }) {
  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(1, ...points.flatMap((p) => series.map((s) => p[s.key])));

  const groupWidth = innerW / points.length;
  const barWidth = Math.min(14, (groupWidth * 0.7) / series.length);
  // A fixed 2px gap between bars works fine at a week/month scale, but at a year scale
  // (365 points) barWidth itself can shrink below 2px, which used to make this negative —
  // an invalid SVG rect width that Chrome throws on for every single bar. Scale the gap
  // down with the bar instead, and never let the drawn width go to (or below) zero.
  const barGap = Math.min(2, barWidth * 0.3);
  const rectWidth = Math.max(0.5, barWidth - barGap);
  const labelStep = Math.max(1, Math.ceil(points.length / 7));

  return (
    <svg className="ds-barchart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Bar chart">
      <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={PADDING.top + innerH} y2={PADDING.top + innerH} className="ds-barchart__axis" />
      {points.map((p, groupIndex) => {
        const groupX = PADDING.left + groupIndex * groupWidth + groupWidth / 2;
        return (
          <g key={p.date}>
            {series.map((s, seriesIndex) => {
              const value = p[s.key];
              const barHeight = (value / maxValue) * innerH;
              const x = groupX - (series.length * barWidth) / 2 + seriesIndex * barWidth;
              const y = PADDING.top + innerH - barHeight;
              return (
                <rect key={s.key} x={x} y={y} width={rectWidth} height={barHeight} style={{ fill: s.color }} rx={2}>
                  <title>{`${p.date} — ${s.label}: ${value}`}</title>
                </rect>
              );
            })}
            {(groupIndex % labelStep === 0 || groupIndex === points.length - 1) && (
              <text x={groupX} y={HEIGHT - PADDING.bottom + 16} className="ds-barchart__axis-label" textAnchor="middle">
                {p.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      <g transform={`translate(${PADDING.left}, ${HEIGHT - 16})`}>
        {series.map((s, i) => (
          <g key={s.key} transform={`translate(${i * 110}, 0)`}>
            <rect width={10} height={10} style={{ fill: s.color }} rx={2} />
            <text x={16} y={9} className="ds-barchart__legend-label">{s.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
