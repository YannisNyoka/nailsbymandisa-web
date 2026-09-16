import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, ConfirmDialog, FormField, Modal, Table, Pagination, useToast } from '../../design-system';
import './AdminPages.css';

export function AdminClientsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [notifyTarget, setNotifyTarget] = useState(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [notifyAlsoSms, setNotifyAlsoSms] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [blockTarget, setBlockTarget] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    setData(await apiClient.get(`/admin/clients?${params.toString()}`));
  }, [page, search]);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load clients.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function handleSendNotify(e) {
    e.preventDefault();
    setSendingNotify(true);
    try {
      await apiClient.post('/admin/notifications/send', {
        userId: notifyTarget._id,
        title: notifyTitle,
        body: notifyBody,
        alsoSms: notifyAlsoSms,
      });
      showToast('Notification sent.', { variant: 'success' });
      setNotifyTarget(null);
      setNotifyTitle('');
      setNotifyBody('');
      setNotifyAlsoSms(false);
    } catch (err) {
      showToast(err.message || 'Could not send.', { variant: 'error' });
    } finally {
      setSendingNotify(false);
    }
  }

  async function handleToggleBlock() {
    const action = blockTarget.isActive ? 'block' : 'unblock';
    await apiClient.post(`/admin/clients/${blockTarget._id}/${action}`);
    showToast(blockTarget.isActive ? 'Client blocked.' : 'Client unblocked.', { variant: 'success' });
    await load();
  }

  const columns = [
    { key: 'name', header: 'Name', render: (c) => <Link to={`/admin/clients/${c._id}`}>{c.firstName} {c.lastName}</Link> },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone', render: (c) => c.phone || '—' },
    { key: 'bookings', header: 'Bookings', render: (c) => c.bookingsCount },
    { key: 'lastBooking', header: 'Last booking', render: (c) => c.lastBookingDate || '—' },
    { key: 'loyalty', header: 'Loyalty', render: (c) => `${c.loyaltyPoints} pts` },
    { key: 'status', header: 'Status', render: (c) => <Badge variant={c.isActive ? 'success' : 'danger'}>{c.isActive ? 'active' : 'blocked'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="admin-table-actions">
          <Button variant="secondary" size="sm" onClick={() => setNotifyTarget(c)}>Notify</Button>
          <Button variant={c.isActive ? 'danger' : 'secondary'} size="sm" onClick={() => setBlockTarget(c)}>
            {c.isActive ? 'Block' : 'Unblock'}
          </Button>
        </div>
      ),
    },
  ];

  if (!data) return <p>Loading clients&hellip;</p>;

  return (
    <div>
      <div className="admin-page__filters">
        <FormField label="Search">
          <input type="search" placeholder="Name or email" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        </FormField>
      </div>
      <Table columns={columns} rows={data.clients} getRowKey={(c) => c._id} emptyMessage="No clients yet." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />

      <Modal
        isOpen={Boolean(notifyTarget)}
        onClose={() => setNotifyTarget(null)}
        title={notifyTarget ? `Notify ${notifyTarget.firstName} ${notifyTarget.lastName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotifyTarget(null)} disabled={sendingNotify}>Cancel</Button>
            <Button onClick={handleSendNotify} loading={sendingNotify}>Send</Button>
          </>
        }
      >
        <form onSubmit={handleSendNotify} noValidate>
          <FormField label="Title" required>
            <input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} maxLength={200} />
          </FormField>
          <FormField label="Message" required>
            <textarea rows={4} value={notifyBody} onChange={(e) => setNotifyBody(e.target.value)} maxLength={2000} />
          </FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input type="checkbox" checked={notifyAlsoSms} onChange={(e) => setNotifyAlsoSms(e.target.checked)} />
            Also send by SMS (if they have a phone number on file)
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        onConfirm={handleToggleBlock}
        title={blockTarget?.isActive ? 'Block this client?' : 'Unblock this client?'}
        summary={
          blockTarget
            ? blockTarget.isActive
              ? `"${blockTarget.firstName} ${blockTarget.lastName}" will no longer be able to log in or book. They can be unblocked later.`
              : `"${blockTarget.firstName} ${blockTarget.lastName}" will be able to log in and book again.`
            : ''
        }
        confirmLabel={blockTarget?.isActive ? 'Block' : 'Unblock'}
        danger={Boolean(blockTarget?.isActive)}
      />
    </div>
  );
}
