import { NavLink, Outlet } from 'react-router-dom';
import './AccountLayout.css';

const ACCOUNT_NAV_ITEMS = [
  { to: '/account/bookings', label: 'My bookings' },
  { to: '/account/loyalty', label: 'Loyalty' },
  { to: '/account/referrals', label: 'Refer a friend' },
  { to: '/account/gift-cards', label: 'Gift cards' },
  { to: '/account/notifications', label: 'Notifications' },
  { to: '/account/profile', label: 'Profile' },
];

// Before this, the only way to move between account pages was reopening the header's
// name dropdown every time — no way to tell which section you were in, or jump sideways
// from one to another. This gives every /account/* page a shared, always-visible tab
// strip (horizontally scrollable on narrow screens) so moving around the account area
// doesn't require going back to the header each time.
export function AccountLayout() {
  return (
    <div className="account-layout">
      <nav className="account-layout__nav" aria-label="Account">
        {ACCOUNT_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `account-layout__nav-link${isActive ? ' account-layout__nav-link--active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
