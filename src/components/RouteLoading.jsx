// Suspense fallback for lazy-loaded route chunks (App.jsx) — shown only for the brief
// moment a page's own code is still downloading, inside whichever layout's <Outlet />
// is loading it, so the nav/header around it stays visible and interactive.
export function RouteLoading() {
  return (
    <p style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading&hellip;</p>
  );
}
