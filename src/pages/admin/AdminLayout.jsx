import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { AdminTopBar } from './AdminTopBar.jsx';
import './AdminLayout.css';

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
  { to: '/admin/subscription-plans', label: 'Subscription plans', icon: '📋' },
  { to: '/admin/subscribers', label: 'Subscribers', icon: '📇' },
  { to: '/admin/gallery', label: 'Gallery', icon: '🖼️' },
  { to: '/admin/gallery-moderation', label: 'Gallery moderation', icon: '🛡️' },
  { to: '/admin/compose-notification', label: 'Send notification', icon: '🔔' },
  { to: '/admin/activity', label: 'Activity', icon: '📜' },
  { to: '/admin/users', label: 'Admin users', icon: '🔑' },
];

export function AdminLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const activeItem = NAV_ITEMS.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

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
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) => `admin-layout__nav-link${isActive ? ' admin-layout__nav-link--active' : ''}`}
            >
              <span className="admin-layout__nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="admin-layout__nav-footer">
          <NavLink to="/" className="admin-layout__nav-back">← Back to site</NavLink>
          <button type="button" className="admin-layout__nav-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </nav>
      <div className="admin-layout__content">
        <AdminTopBar title={activeItem?.label || 'Admin'} />
        <div className="admin-layout__page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
