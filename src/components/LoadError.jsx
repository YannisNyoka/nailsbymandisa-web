import { Button } from '../design-system';

// Shared fallback for a page whose initial data fetch failed — every page that gates its
// whole render on `if (!data) return <p>Loading…</p>` used to have no way out of that
// state if the fetch itself failed (a dropped connection, a 500, going offline): the
// toast fired once and vanished, and the page was stuck on "Loading…" forever with no
// retry short of a full reload. This gives every one of those pages the same way out.
export function LoadError({ message, onRetry }) {
  return (
    <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        {message || 'Something went wrong loading this page.'}
      </p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
