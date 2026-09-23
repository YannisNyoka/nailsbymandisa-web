import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.js';
import './NotificationBell.css';

const PREVIEW_LIMIT = 5;

const DATE_FORMATTER = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' });

// Colored icon per notification type, matching the reference dropdown's per-item status
// glyph — a quick visual read of "good news vs. bad news vs. just an update" before
// reading the title.
const TYPE_ICON = {
  booking_confirmed: { glyph: '✓', variant: 'success' },
  booking_cancelled: { glyph: '✕', variant: 'danger' },
  payment_failed: { glyph: '✕', variant: 'danger' },
  admin_message: { glyph: '💬', variant: 'accent' },
  broadcast: { glyph: '📢', variant: 'accent' },
};

// Only ever rendered inside Layout.jsx's `isAuthenticated` branch — a signed-out visitor
// has no notifications to show and no account to check them against.
export function NotificationBell() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const detailsRef = useRef(null);

  function load() {
    apiClient.get('/notifications').then(setData).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  async function handleOpen(n) {
    close();
    if (!n.isRead) {
      // Optimistic — the bell stays mounted across a client-side navigate() (Layout wraps
      // every route), so without this the badge would keep showing the stale pre-read
      // count until something else happens to trigger a reload.
      setData((prev) =>
        prev && {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)),
        }
      );
      apiClient.patch(`/notifications/${n._id}/read`).catch(() => load());
    }
    if (n.link) navigate(n.link);
  }

  async function handleDismiss(e, id) {
    e.preventDefault();
    e.stopPropagation();
    setPendingId(id);
    try {
      await apiClient.delete(`/notifications/${id}`);
      load();
    } catch {
      // Best-effort — the item just stays put if this failed, no need to interrupt the
      // dropdown with an error toast over something this low-stakes.
    } finally {
      setPendingId(null);
    }
  }

  async function handleClearAll(e) {
    e.preventDefault();
    e.stopPropagation();
    setClearing(true);
    try {
      await apiClient.delete('/notifications');
      load();
    } catch {
      // Same best-effort reasoning as handleDismiss.
    } finally {
      setClearing(false);
    }
  }

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <details className="notification-bell" ref={detailsRef} onToggle={(e) => e.target.open && load()}>
      <summary className="notification-bell__trigger" aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </summary>
      <div className="notification-bell__panel">
        <div className="notification-bell__panel-header">
          <p className="notification-bell__panel-title">Notifications</p>
          <div className="notification-bell__panel-actions">
            {data?.notifications.length > 0 && (
              <button type="button" className="notification-bell__clear-all" onClick={handleClearAll} disabled={clearing}>
                Clear all
              </button>
            )}
            <button type="button" className="notification-bell__close" aria-label="Close notifications" onClick={close}>
              ✕
            </button>
          </div>
        </div>
        {!data || data.notifications.length === 0 ? (
          <div className="notification-bell__empty">
            <span className="notification-bell__empty-icon" aria-hidden="true">🔔</span>
            <p>No notifications yet</p>
            <p className="notification-bell__empty-hint">We&rsquo;ll let you know when something happens</p>
          </div>
        ) : (
          <>
            <ul className="notification-bell__list">
              {data.notifications.slice(0, PREVIEW_LIMIT).map((n) => {
                const icon = TYPE_ICON[n.type] || TYPE_ICON.admin_message;
                return (
                  <li key={n._id} className={`notification-bell__item${n.isRead ? '' : ' notification-bell__item--unread'}`}>
                    <span className={`notification-bell__item-icon notification-bell__item-icon--${icon.variant}`} aria-hidden="true">
                      {icon.glyph}
                    </span>
                    <button type="button" className="notification-bell__item-main" onClick={() => handleOpen(n)}>
                      <span className="notification-bell__item-title">{n.title}</span>
                      <span className="notification-bell__item-body">{n.body}</span>
                      <span className="notification-bell__item-date">{DATE_FORMATTER.format(new Date(n.createdAt))}</span>
                    </button>
                    <span className="notification-bell__item-actions">
                      {n.link && (
                        <button type="button" className="notification-bell__item-open" aria-label="Open" onClick={() => handleOpen(n)}>
                          →
                        </button>
                      )}
                      <button
                        type="button"
                        className="notification-bell__item-dismiss"
                        aria-label="Dismiss"
                        disabled={pendingId === n._id}
                        onClick={(e) => handleDismiss(e, n._id)}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link to="/account/notifications" className="notification-bell__view-all" onClick={close}>
              View all
            </Link>
          </>
        )}
      </div>
    </details>
  );
}
