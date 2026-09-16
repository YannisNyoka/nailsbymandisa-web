import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, FormField, Modal, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

const emptyForm = { code: '', type: 'percentage', value: '', minBookingAmountRand: '', usageLimit: '', expiresAt: '' };

function formatValue(d) {
  return d.type === 'percentage' ? `${d.value}%` : `R${(d.value / 100).toFixed(2)}`;
}

export function AdminDiscountCodesPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setData(await apiClient.get(`/discount-codes?page=${page}&pageSize=20`));
  }, [page]);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load discount codes.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/discount-codes', {
        code: form.code || undefined,
        type: form.type,
        value: form.type === 'percentage' ? Number(form.value) : Math.round(Number(form.value) * 100),
        minBookingAmountCents: form.minBookingAmountRand ? Math.round(Number(form.minBookingAmountRand) * 100) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        expiresAt: form.expiresAt || null,
      });
      showToast('Discount code created.', { variant: 'success' });
      setCreating(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not create discount code.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(discount) {
    setTogglingId(discount._id);
    try {
      await apiClient.patch(`/discount-codes/${discount._id}`, { isActive: !discount.isActive });
      await load();
    } catch (err) {
      showToast(err.message || 'Could not update this code.', { variant: 'error' });
    } finally {
      setTogglingId(null);
    }
  }

  const columns = [
    { key: 'code', header: 'Code' },
    { key: 'value', header: 'Value', render: formatValue },
    { key: 'usage', header: 'Uses', render: (d) => (d.usesRemaining === null ? `${d.usageCount} (unlimited)` : `${d.usageCount} / ${d.usageCount + d.usesRemaining}`) },
    { key: 'source', header: 'Source' },
    { key: 'status', header: 'Status', render: (d) => <Badge variant={d.isActive ? 'success' : 'neutral'}>{d.isActive ? 'active' : 'inactive'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => toggleActive(d)}
          loading={togglingId === d._id}
          disabled={togglingId !== null && togglingId !== d._id}
        >
          {d.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  if (!data) return <p>Loading discount codes&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Button onClick={() => setCreating(true)}>Add code</Button>
      </div>
      <Table columns={columns} rows={data.discountCodes} getRowKey={(d) => d._id} emptyMessage="No discount codes yet." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />

      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Add discount code"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Create</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Code" hint="Leave blank to auto-generate">
            <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </FormField>
          <div className="admin-form-grid">
            <FormField label="Type" required>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount (R)</option>
              </select>
            </FormField>
            <FormField label={form.type === 'percentage' ? 'Percent off' : 'Amount off (R)'} required>
              <input type="number" min={0} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
            </FormField>
          </div>
          <div className="admin-form-grid">
            <FormField label="Minimum booking (R)">
              <input type="number" min={0} value={form.minBookingAmountRand} onChange={(e) => setForm((f) => ({ ...f, minBookingAmountRand: e.target.value }))} />
            </FormField>
            <FormField label="Usage limit" hint="Blank = unlimited">
              <input type="number" min={1} value={form.usageLimit} onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Expires">
            <input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
