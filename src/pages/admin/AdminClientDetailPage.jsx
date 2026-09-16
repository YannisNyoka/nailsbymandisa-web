import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, FormField, Modal, Table, useToast } from '../../design-system';
import './AdminPages.css';

const COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'time', header: 'Time', render: (a) => `${a.startTime}–${a.endTime}` },
  { key: 'price', header: 'Price', render: (a) => `R${(a.totalPriceCents / 100).toFixed(2)}` },
  { key: 'status', header: 'Status', render: (a) => <Badge>{a.status.replace('_', ' ')}</Badge> },
];

export function AdminClientDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadLedger() {
    const result = await apiClient.get(`/loyalty/clients/${id}`);
    setLedger(result);
  }

  useEffect(() => {
    apiClient
      .get(`/admin/clients/${id}`)
      .then(setData)
      .catch((err) => showToast(err.message || 'Could not load this client.', { variant: 'error' }));
    loadLedger().catch((err) => showToast(err.message || 'Could not load loyalty ledger.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAdjust(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/loyalty/clients/${id}/adjust`, { points: Number(points), note: note || null });
      showToast('Points adjusted.', { variant: 'success' });
      setAdjusting(false);
      setPoints('');
      setNote('');
      await loadLedger();
    } catch (err) {
      showToast(err.message || 'Could not adjust points.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return <p>Loading&hellip;</p>;

  const { client, appointments } = data;

  return (
    <div>
      <h2>{client.firstName} {client.lastName}</h2>
      <p>{client.email} {client.phone ? `· ${client.phone}` : ''}</p>
      <p>Joined {new Date(client.createdAt).toLocaleDateString()}</p>

      {ledger && (
        <section className="account-page__section" style={{ maxWidth: 400 }}>
          <h2>Loyalty</h2>
          <p>
            <strong>{ledger.pointsBalance}</strong> points &middot; {ledger.tier.name} tier &middot;{' '}
            {ledger.lifetimePointsEarned} lifetime earned
          </p>
          <Button variant="secondary" size="sm" onClick={() => setAdjusting(true)}>
            Adjust points
          </Button>
        </section>
      )}

      <h2>Booking history</h2>
      <Table columns={COLUMNS} rows={appointments} getRowKey={(a) => a._id} emptyMessage="No bookings yet." />

      <Modal
        isOpen={adjusting}
        onClose={() => setAdjusting(false)}
        title="Adjust loyalty points"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjusting(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAdjust} loading={submitting}>Apply</Button>
          </>
        }
      >
        <form onSubmit={handleAdjust} noValidate>
          <FormField label="Points" required hint="Positive to award, negative to deduct">
            <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
          </FormField>
          <FormField label="Note">
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
