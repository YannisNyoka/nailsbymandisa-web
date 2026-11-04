import { Suspense, useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { AdminTopBar } from './AdminTopBar.jsx';
import { RouteLoading } from '../../components/RouteLoading.jsx';
import './AdminLayout.css';

// Per-browser, not per-account — this is purely "have I looked at this page recently",
// not data anyone else needs to see or that Claude/the server needs to read back, so
// localStorage is the right place for it (see the per-viewer-convenience guidance) rather
// than a new read-state field on the server's activityLog collection.
const ACTIVITY_LAST_SEEN_KEY = 'admin_activity_last_seen_at';

function getActivityLastSeen() {
  try {
    return localStorage.getItem(ACTIVITY_LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function setActivityLastSeen(iso) {
  try {
    localStorage.setItem(ACTIVITY_LAST_SEEN_KEY, iso);
  } catch {
    // Private window / blocked storage — the badge just won't persist across visits,
    // not worth interrupting anything over.
  }
}

// Flat list (no category grouping) to match the reference dashboard's sidebar — icons are
// plain emoji so this needs no new icon-library dependency.
const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/homepage', label: 'Homepage', icon: '🖥️' },
  { to: '/admin/appointments', label: 'Appointments', icon: '📅' },
  { to: '/admin/schedule', label: 'Schedule', icon: '🗓️' },
  { to: '/admin/services', label: 'Services', icon: '💅' },
  { to: '/admin/staff', label: 'Staff', icon: '🧑‍🎨' },
  { to: '/admin/clients', label: 'Clients', icon: '👥' },
  { to: '/admin/availability', label: 'Availability', icon: '⛔' },
  { to: '/admin/payments', label: 'Payments', icon: '💳' },
  { to: '/admin/discount-codes', label: 'Discount codes', icon: '🏷️' },
  { to: '/admin/gift-cards', label: 'Gift cards', icon: '🎁' },
  { to: '/admin/gallery', label: 'Gallery', icon: '🖼️' },
  { to: '/admin/gallery-moderation', label: 'Gallery moderation', icon: '🛡️' },
  { to: '/admin/compose-notification', label: 'Send notification', icon: '🔔' },
  { to: '/admin/enquiries', label: 'Enquiries', icon: '✉️' },
  { to: '/admin/activity', label: 'Activity', icon: '📜' },
  { to: '/admin/users', label: 'Admin users', icon: '🔑' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📊' },
];

// A linked staff login (role 'staff') only ever sees what concerns them — their own
// appointments, schedule and overview — never the full salon-wide admin surface. This is
// a UX convenience (hide the nav, redirect away from other pages); the real boundary is
// server-side scoping in every admin route (see requirePermissionOrStaffSelf).
const STAFF_ALLOWED_PATHS = ['/admin', '/admin/appointments', '/admin/schedule'];
const STAFF_NAV_ITEMS = NAV_ITEMS.filter((item) => STAFF_ALLOWED_PATHS.includes(item.to));

export function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [unseenActivityCount, setUnseenActivityCount] = useState(0);
  // The count shown next to the page title in AdminTopBar (e.g. "Appointments 415") —
  // each page sets it via useOutletContext()'s setPageCount, typically from the same
  // `total` its own filtered list fetch already returns, so it tracks the active filters
  // for free. Reset to null on every navigation so a page that doesn't set one (most of
  // them) doesn't keep showing the previous page's number.
  const [pageCount, setPageCount] = useState(null);
  const location = useLocation();
  const { user, logout } = useAuth();
  const isStaff = user?.role === 'staff';
  const navItems = isStaff ? STAFF_NAV_ITEMS : NAV_ITEMS;
  const activeItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  // Re-checked on every navigation within /admin (not just once on mount) so neither
  // badge goes stale after an action elsewhere — deleting an unpaid appointment, or a new
  // activity log entry landing — without needing a shared store just for two sidebar
  // counts. Admin-only (both figures come from admin-scoped endpoints staff can't call
  // for Activity, and the Appointments one is kept consistent with the rest of the unpaid
  // feature, which is admin-only throughout). Both hooks run unconditionally (the isStaff
  // check is inside each effect, not a guard around the useEffect call itself) — the
  // staff redirect below is a `return` from the component, which would otherwise change
  // how many hooks run between renders and violate the Rules of Hooks.
  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get('/appointments?status=pending_payment&pageSize=1')
      .then(({ total }) => setUnpaidCount(total))
      .catch(() => {});
  }, [location.pathname, isStaff]);

  useEffect(() => {
    if (isStaff) return;
    // Visiting the Activity page itself clears its own badge instead of counting it.
    if (location.pathname.startsWith('/admin/activity')) {
      setActivityLastSeen(new Date().toISOString());
      setUnseenActivityCount(0);
      return;
    }
    apiClient
      .get('/admin/activity?page=1&pageSize=30')
      .then(({ entries }) => {
        const lastSeen = getActivityLastSeen();
        // First time ever (no stored marker) — start counting from now rather than
        // surprising a brand-new admin with a big "unseen" number for history that
        // predates them ever looking at this page at all.
        if (!lastSeen) {
          setActivityLastSeen(new Date().toISOString());
          setUnseenActivityCount(0);
          return;
        }
        const lastSeenTime = new Date(lastSeen).getTime();
        setUnseenActivityCount(entries.filter((e) => new Date(e.createdAt).getTime() > lastSeenTime).length);
      })
      .catch(() => {});
  }, [location.pathname, isStaff]);

  useEffect(() => {
    setPageCount(null);
  }, [location.pathname]);

  if (isStaff && !STAFF_ALLOWED_PATHS.some((p) => (p === '/admin' ? location.pathname === p : location.pathname.startsWith(p)))) {
    return <Navigate to="/admin" replace />;
  }

  const navBadge = (to) => {
    if (to === '/admin/appointments') return unpaidCount;
    if (to === '/admin/activity') return unseenActivityCount;
    return 0;
  };

  return (
    <div className="admin-layout">
      {/* Below 700px the full nav is long enough that showing it expanded would push every
          page's actual content below the fold. Collapsed behind this toggle by default on
          mobile; always visible on desktop regardless of navOpen (see CSS). */}
      <button
        type="button"
        className="admin-layout__nav-toggle"
        aria-expanded={navOpen}
        onClick={() => setNavOpen((open) => !open)}
      >
        {activeItem?.label || 'Menu'} <span aria-hidden="true">{navOpen ? '▴' : '▾'}</span>
      </button>
      <nav className={`admin-layout__nav${navOpen ? ' admin-layout__nav--open' : ''}`} aria-label="Admin">
        <div className="admin-layout__nav-header">
          <img src="/brand/logo-lockup.png" alt="NailsByMandisa" className="admin-layout__nav-logo" />
          <p className="admin-layout__nav-caption">Admin panel</p>
        </div>
        <div className="admin-layout__nav-links">
          {navItems.map((item) => {
            const badge = navBadge(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setNavOpen(false)}
                className={({ isActive }) => `admin-layout__nav-link${isActive ? ' admin-layout__nav-link--active' : ''}`}
              >
                <span className="admin-layout__nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
                {badge > 0 && <span className="admin-layout__nav-badge">{badge > 99 ? '99+' : badge}</span>}
              </NavLink>
            );
          })}
        </div>
        <div className="admin-layout__nav-footer">
          <NavLink to="/" className="admin-layout__nav-back">← Back to site</NavLink>
          <button type="button" className="admin-layout__nav-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </nav>
      <div className="admin-layout__content">
        <AdminTopBar title={activeItem?.label || 'Admin'} unpaidCount={unpaidCount} count={pageCount} />
        <div className="admin-layout__page">
          <Suspense fallback={<RouteLoading />}>
            <Outlet context={{ setPageCount }} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
