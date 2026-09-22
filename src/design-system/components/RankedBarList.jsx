import './RankedBarList.css';

// Dependency-free horizontal ranked-bar list — shared by every "which X drives the
// business" admin widget (top services, staff bookings, booking status breakdown,
// revenue by type) that all share this exact label/bar/value shape.
export function RankedBarList({ items, formatValue = (v) => v, emptyLabel = 'No data yet.' }) {
  if (!items || items.length === 0) return <p className="ds-rankedbarlist__empty">{emptyLabel}</p>;

  const maxValue = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="ds-rankedbarlist">
      {items.map((item) => (
        <li key={item.label} className="ds-rankedbarlist__row">
          <span className="ds-rankedbarlist__label">{item.label}</span>
          <span className="ds-rankedbarlist__track">
            <span
              className="ds-rankedbarlist__bar"
              style={{ width: `${Math.max(4, (item.value / maxValue) * 100)}%`, background: item.color }}
            />
          </span>
          <span className="ds-rankedbarlist__value">{formatValue(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
