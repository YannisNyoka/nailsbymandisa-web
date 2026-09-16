import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

const STATUS_VARIANT = { pending: 'warning', active: 'success', cancelled: 'neutral' };

export function AdminSubscriptionsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [clientsById, setClientsById] = useState({});
  const [plansById, setPlansById] = useState({});

  const load = useCallback(async () => {
    const [subsResult, { clients }, { plans }] = await Promise.all([
      apiClient.get(`/subscriptions?page=${page}&pageSize=20`),
      apiClient.get('/admin/clients?pageSize=100'),
      apiClient.get('/subscriptions/plans'),
    ]);
    setData(subsResult);
    setClientsById(Object.fromEntries(clients.map((c) => [c._id, c])));
    setPlansById(Object.fromEntries(plans.map((p) => [p._id, p])));
  }, [page]);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load subscriptions.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (!data) return <p>Loading subscriptions&hellip;</p>;

  const columns = [
    {
      key: 'client',
      header: 'Client',
      render: (s) => {
        const c = clientsById[s.userId];
        return c ? `${c.firstName} ${c.lastName}` : s.userId;
      },
    },
    { key: 'plan', header: 'Plan', render: (s) => plansById[s.planId]?.name || '—' },
    { key: 'credits', header: 'Credits left', render: (s) => s.creditsRemaining },
    { key: 'status', header: 'Status', render: (s) => <Badge variant={STATUS_VARIANT[s.status] || 'neutral'}>{s.status}</Badge> },
    { key: 'periodEnd', header: 'Period ends', render: (s) => (s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—') },
  ];

  return (
    <div>
      <Table columns={columns} rows={data.subscriptions} getRowKey={(s) => s._id} emptyMessage="No subscribers yet." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
    </div>
  );
}
