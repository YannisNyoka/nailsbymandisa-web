import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SimpleBarChart } from './SimpleBarChart.jsx';

const SERIES = [
  { key: 'booked', label: 'Booked', color: 'red' },
  { key: 'cancelled', label: 'Cancelled', color: 'blue' },
  { key: 'completed', label: 'Completed', color: 'green' },
];

function points(count) {
  const start = new Date('2026-01-01');
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d.toISOString().slice(0, 10), booked: 1, cancelled: 0, completed: 0 };
  });
}

describe('SimpleBarChart', () => {
  // A year view (365 points) shrinks each bar below the fixed gap that used to be
  // subtracted from its width, producing a negative `width` — an invalid SVG attribute
  // Chrome rejects and logs as a console error for every single bar.
  it('never renders a bar rect with a negative width, even with a full year of points', () => {
    const { container } = render(<SimpleBarChart points={points(365)} series={SERIES} />);
    const rects = [...container.querySelectorAll('rect')];
    expect(rects.length).toBeGreaterThan(0);
    for (const rect of rects) {
      expect(Number(rect.getAttribute('width'))).toBeGreaterThanOrEqual(0);
    }
  });

  it('still renders sensible bar widths at a normal (week) scale', () => {
    const { container } = render(<SimpleBarChart points={points(7)} series={SERIES} />);
    const rects = [...container.querySelectorAll('rect')];
    for (const rect of rects) {
      expect(Number(rect.getAttribute('width'))).toBeGreaterThan(0);
    }
  });
});
