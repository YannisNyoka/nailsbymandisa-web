import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../design-system';
import { WhatsAppButton } from './WhatsAppButton.jsx';
import { InstallPrompt } from './InstallPrompt.jsx';
import { SocialLinks } from './SocialLinks.jsx';
import './Layout.css';

const YEAR = new Date().getFullYear();

export function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  // Neither makes sense inside the admin dashboard — WhatsApp is a customer contact
  // channel, and the install prompt is for the public/account side of the site. Both are
  // also fixed-position, so on /admin they'd otherwise float over the sidebar's own
  // "Back to site"/"Log out" controls.
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          <img src="/brand/logo-lockup.png" alt="NailsByMandisa — Clean. Chic. Creative." className="layout__brand-logo" />
        </Link>
        <nav className="layout__nav" aria-label="Main">
          <Link to="/book" className="layout__cta-link">
            Book now
          </Link>
          <Link to="/gallery">Gallery</Link>
          <Link to="/gift-cards/purchase">Gift cards</Link>
          <Link to="/subscriptions/plans">Membership</Link>
          {isAuthenticated ? (
            <>
              {user.role === 'admin' && <Link to="/admin">Admin</Link>}
              <Link to="/account/notifications">Notifications</Link>
              <details className="layout__account-menu">
                <summary>{user.firstName}</summary>
                <div className="layout__account-menu-panel">
                  <Link to="/account/bookings">My bookings</Link>
                  <Link to="/account/loyalty">Loyalty</Link>
                  <Link to="/account/referrals">Refer a friend</Link>
                  <Link to="/account/gift-cards">My gift cards</Link>
                  <Link to="/account/subscription">Subscription</Link>
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
