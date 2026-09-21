import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, Table, useToast } from '../../design-system';
import './AdminPages.css';

export function AdminEnquiriesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [markingId, setMarkingId] = useState(null);

  const load = useCallback(async () => {
    setData(await apiClient.get('/contact'));
  }, []);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load enquiries.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function markRead(id) {
    setMarkingId(id);
    try {
      await apiClient.patch(`/contact/${id}/read`);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not update this enquiry.', { variant: 'error' });
    } finally {
      setMarkingId(null);
    }
  }

  const columns = [
    {
      key: 'from',
      header: 'From',
      render: (e) => (
        <div>
          <strong>{e.name || '(no name given)'}</strong>
          <div className="admin-page__muted">
            <a href={`mailto:${e.email}`}>{e.email}</a>
          </div>
        </div>
      ),
    },
    { key: 'message', header: 'Message', render: (e) => <span className="admin-enquiries__message">{e.message}</span> },
    { key: 'date', header: 'Received', render: (e) => new Date(e.createdAt).toLocaleString() },
    { key: 'status', header: '', render: (e) => (e.isRead ? null : <Badge variant="accent">New</Badge>) },
    {
      key: 'actions',
      header: '',
      render: (e) =>
        !e.isRead && (
          <Button variant="secondary" size="sm" onClick={() => markRead(e._id)} loading={markingId === e._id}>
            Mark read
          </Button>
        ),
    },
  ];

  if (!data) return <p>Loading&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Badge>{data.unreadCount} unread</Badge>
      </div>
      <Table columns={columns} rows={data.enquiries} getRowKey={(e) => e._id} emptyMessage="No enquiries yet." />
    </div>
  );
}
