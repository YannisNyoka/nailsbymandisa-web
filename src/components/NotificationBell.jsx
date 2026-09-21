import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.js';
import './NotificationBell.css';

const PREVIEW_LIMIT = 5;

// Only ever rendered inside Layout.jsx's `isAuthenticated` branch — a signed-out visitor
// has no notifications to show and no account to check them against.
export function NotificationBell() {
  const [data, setData] = useState(null);
  const detailsRef = useRef(null);

  function load() {
    apiClient.get('/notifications').then(setData).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

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
        <p className="notification-bell__panel-title">Notifications</p>
        {!data || data.notifications.length === 0 ? (
          <div className="notification-bell__empty">
            <span className="notification-bell__empty-icon" aria-hidden="true">🔔</span>
            <p>No notifications yet</p>
            <p className="notification-bell__empty-hint">We&rsquo;ll let you know when something happens</p>
          </div>
        ) : (
          <>
            <ul className="notification-bell__list">
              {data.notifications.slice(0, PREVIEW_LIMIT).map((n) => (
                <li key={n._id} className={`notification-bell__item${n.isRead ? '' : ' notification-bell__item--unread'}`}>
                  <span className="notification-bell__item-title">{n.title}</span>
                  <span className="notification-bell__item-body">{n.body}</span>
                </li>
              ))}
            </ul>
            <Link to="/account/notifications" className="notification-bell__view-all" onClick={() => { if (detailsRef.current) detailsRef.current.open = false; }}>
              View all
            </Link>
          </>
        )}
      </div>
    </details>
  );
}
