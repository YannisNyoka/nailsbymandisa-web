import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, ConfirmDialog, FormField, Modal, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

const STATUS_VARIANT = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
  partially_refunded: 'info',
};

export function AdminPaymentsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState(null);

  async function load() {
    const result = await apiClient.get(`/payments?page=${page}&pageSize=20`);
    setData(result);
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load payments.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const columns = [
    { key: 'purpose', header: 'For', render: (p) => p.purpose.replace('_', ' ') },
    { key: 'amount', header: 'Amount', render: (p) => `R${(p.amountCents / 100).toFixed(2)}` },
    { key: 'refunded', header: 'Refunded', render: (p) => (p.refundedAmountCents > 0 ? `R${(p.refundedAmountCents / 100).toFixed(2)}` : '—') },
    { key: 'status', header: 'Status', render: (p) => <Badge variant={STATUS_VARIANT[p.status] || 'neutral'}>{p.status.replace('_', ' ')}</Badge> },
    { key: 'date', header: 'Date', render: (p) => new Date(p.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      render: (p) =>
        ['paid', 'partially_refunded'].includes(p.status) && (
          <Button variant="danger" size="sm" onClick={() => setRefundTarget(p)}>Refund</Button>
        ),
    },
  ];

  if (!data) return <p>Loading payments&hellip;</p>;

  return (
    <div>
      <Table columns={columns} rows={data.payments} getRowKey={(p) => p._id} emptyMessage="No payments yet." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />

      {refundTarget && (
        <RefundModal payment={refundTarget} onClose={() => setRefundTarget(null)} onDone={async () => { setRefundTarget(null); await load(); }} />
      )}
    </div>
  );
}

function RefundModal({ payment, onClose, onDone }) {
  const { showToast } = useToast();
  const remainingRand = ((payment.amountCents - payment.refundedAmountCents) / 100).toFixed(2);
  const [amountRand, setAmountRand] = useState(remainingRand);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  function handleReview(e) {
    e.preventDefault();
    setConfirming(true);
  }

  async function handleConfirm() {
    try {
      await apiClient.post(`/payments/${payment._id}/refund`, {
        amountCents: Math.round(Number(amountRand) * 100),
        reason: reason || null,
      });
      showToast('Refund issued.', { variant: 'success' });
      await onDone();
    } catch (err) {
      showToast(err.message || 'Could not issue refund.', { variant: 'error' });
      throw err;
    }
  }

  // Refunds change money owed and can't be undone — same confirm-with-summary
  // pattern as every other destructive admin action (§7.2), kept as a second
  // step after the amount/reason form rather than firing on first click.
  if (confirming) {
    return (
      <ConfirmDialog
        isOpen
        onClose={() => setConfirming(false)}
        onConfirm={handleConfirm}
        title="Confirm refund"
        summary={`This will refund R${Number(amountRand).toFixed(2)} to the customer for this payment${reason ? ` (reason: ${reason})` : ''}. This cannot be undone.`}
        confirmLabel="Issue refund"
        danger
      />
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Issue a refund"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={handleReview}>Review refund</Button>
        </>
      }
    >
      <form onSubmit={handleReview} noValidate>
        <p>Up to R{remainingRand} can still be refunded on this payment.</p>
        <FormField label="Refund amount (R)" required>
          <input type="number" min={0} max={remainingRand} step="0.01" value={amountRand} onChange={(e) => setAmountRand(e.target.value)} />
        </FormField>
        <FormField label="Reason" hint="Shown in the payment's audit trail">
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </form>
    </Modal>
  );
}
