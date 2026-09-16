import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Button, useToast } from '../../design-system';
import './AccountPages.css';

export function NotificationsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    const result = await apiClient.get('/notifications');
    setData(result);
  }, []);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load notifications.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(id) {
    setPendingId(id);
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not update notification.', { variant: 'error' });
    } finally {
      setPendingId(null);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await apiClient.post('/notifications/read-all');
      await load();
    } catch (err) {
      showToast(err.message || 'Could not update notifications.', { variant: 'error' });
    } finally {
      setMarkingAll(false);
    }
  }

  async function remove(id) {
    setPendingId(id);
    try {
      await apiClient.delete(`/notifications/${id}`);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not delete notification.', { variant: 'error' });
    } finally {
      setPendingId(null);
    }
  }

  if (!data) return <p>Loading notifications&hellip;</p>;

  return (
    <div className="account-page">
      <div className="account-page__header-row">
        <h1>Notifications</h1>
        {data.unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead} loading={markingAll} disabled={pendingId !== null}>
            Mark all as read
          </Button>
        )}
      </div>
      {data.notifications.length === 0 && <p>You&rsquo;re all caught up.</p>}
      <ul className="notification-list">
        {data.notifications.map((n) => (
          <li key={n._id} className={`notification-item${n.isRead ? '' : ' notification-item--unread'}`}>
            <div>
              <div className="notification-item__title">{n.title}</div>
              <div className="notification-item__body">{n.body}</div>
            </div>
            <div className="notification-item__actions">
              {!n.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markRead(n._id)}
                  loading={pendingId === n._id}
                  disabled={markingAll || (pendingId !== null && pendingId !== n._id)}
                >
                  Mark read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(n._id)}
                loading={pendingId === n._id}
                disabled={markingAll || (pendingId !== null && pendingId !== n._id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
