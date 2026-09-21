import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../design-system';
import { WhatsAppButton } from './WhatsAppButton.jsx';
import { InstallPrompt } from './InstallPrompt.jsx';
import { SocialLinks } from './SocialLinks.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import './Layout.css';

const YEAR = new Date().getFullYear();

function navLinkClass({ isActive }) {
  return isActive ? 'layout__nav-link--active' : undefined;
}

export function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  // Neither makes sense inside the admin dashboard — WhatsApp is a customer contact
  // channel, and the install prompt is for the public/account side of the site. Both are
  // also fixed-position, so on /admin they'd otherwise float over the sidebar's own
  // "Back to site"/"Log out" controls.
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Close the mobile nav panel automatically whenever the route changes, so tapping a
  // link doesn't leave the panel open behind the new page.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          <img src="/brand/logo-lockup.png" alt="NailsByMandisa — Clean. Chic. Creative." className="layout__brand-logo" />
        </Link>
        <button
          type="button"
          className="layout__nav-toggle"
          aria-expanded={navOpen}
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setNavOpen((open) => !open)}
        >
          <span aria-hidden="true">{navOpen ? '✕' : '☰'}</span>
        </button>
        <nav className={`layout__nav${navOpen ? ' layout__nav--open' : ''}`} aria-label="Main">
          <Link to="/book" className="layout__cta-link">
            Book now
          </Link>
          <NavLink to="/gallery" className={navLinkClass}>Gallery</NavLink>
          <NavLink to="/gift-cards/purchase" className={navLinkClass}>Gift cards</NavLink>
          <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
          {isAuthenticated ? (
            <>
              {(user.role === 'admin' || user.role === 'staff') && <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>}
              <NotificationBell />
              <details className="layout__account-menu">
                <summary>{user.firstName}</summary>
                <div className="layout__account-menu-panel">
                  <Link to="/account/bookings">My bookings</Link>
                  <Link to="/account/loyalty">Loyalty</Link>
                  <Link to="/account/referrals">Refer a friend</Link>
                  <Link to="/account/gift-cards">My gift cards</Link>
                  <Link to="/gallery/submit">Share a photo</Link>
                  <Link to="/account/profile">Profile</Link>
                </div>
              </details>
              <Button variant="ghost" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="layout__cta-link">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
      <footer className="layout__footer">
        <div className="layout__footer-brand">
          <img src="/brand/logo-lockup.png" alt="NailsByMandisa — Clean. Chic. Creative." className="layout__brand-logo layout__brand-logo--footer" />
        </div>
        <div className="layout__footer-contact">
          <a href="tel:+27766878843">076 687 8843</a>
          <a href="mailto:nailsbymandisa@gmail.com">nailsbymandisa@gmail.com</a>
          <span>882 Almondrock, Strubensvalley, Roodepoort, 1734</span>
        </div>
        <SocialLinks />
        <p className="layout__footer-copyright">&copy; {YEAR} NailsByMandisa. All rights reserved.</p>
      </footer>
      {!isAdminRoute && (
        <>
          <WhatsAppButton />
          <InstallPrompt />
        </>
      )}
    </div>
  );
}
