import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

const STATUS_VARIANT = { pending: 'warning', active: 'success', cancelled: 'neutral' };

const COLUMNS = [
  { key: 'code', header: 'Code' },
  { key: 'purchaser', header: 'Purchased by', render: (c) => c.purchaserEmail },
  { key: 'recipient', header: 'Recipient', render: (c) => c.recipientEmail || '—' },
  { key: 'balance', header: 'Balance', render: (c) => `R${(c.balanceCents / 100).toFixed(2)} / R${(c.initialAmountCents / 100).toFixed(2)}` },
  { key: 'status', header: 'Status', render: (c) => <Badge variant={STATUS_VARIANT[c.status] || 'neutral'}>{c.status}</Badge> },
  { key: 'created', header: 'Purchased', render: (c) => new Date(c.createdAt).toLocaleDateString() },
];

export function AdminGiftCardsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiClient
      .get(`/gift-cards?page=${page}&pageSize=20`)
      .then(setData)
      .catch((err) => showToast(err.message || 'Could not load gift cards.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  if (!data) return <p>Loading gift cards&hellip;</p>;

  return (
    <div>
      <Table columns={COLUMNS} rows={data.giftCards} getRowKey={(c) => c._id} emptyMessage="No gift cards issued yet." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
    </div>
  );
}
