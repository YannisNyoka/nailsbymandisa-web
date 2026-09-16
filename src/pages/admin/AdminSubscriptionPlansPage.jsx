import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, ConfirmDialog, FormField, Modal, Table, useToast } from '../../design-system';
import './AdminPages.css';

const emptyForm = { name: '', description: '', priceRand: '', creditsPerPeriod: '', periodDays: '30' };

export function AdminSubscriptionPlansPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { plans: list } = await apiClient.get('/subscriptions/plans');
    setPlans(list);
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load plans.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditing({});
  }

  function openEdit(plan) {
    setForm({
      name: plan.name,
      description: plan.description || '',
      priceRand: (plan.priceCents / 100).toString(),
      creditsPerPeriod: String(plan.creditsPerPeriod),
      periodDays: String(plan.periodDays),
    });
    setEditing(plan);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        priceCents: Math.round(Number(form.priceRand) * 100),
        creditsPerPeriod: Number(form.creditsPerPeriod),
        periodDays: Number(form.periodDays),
      };
      if (editing._id) {
        await apiClient.patch(`/subscriptions/plans/${editing._id}`, payload);
      } else {
        await apiClient.post('/subscriptions/plans', payload);
      }
      showToast('Plan saved.', { variant: 'success' });
      setEditing(null);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not save plan.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await apiClient.delete(`/subscriptions/plans/${deleteTarget._id}`);
      showToast('Plan deleted.', { variant: 'success' });
      await load();
    } catch (err) {
      showToast(err.message || 'Could not delete plan.', { variant: 'error' });
    }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'price', header: 'Price', render: (p) => `R${(p.priceCents / 100).toFixed(2)} / ${p.periodDays}d` },
    { key: 'credits', header: 'Credits/period' },
    { key: 'status', header: 'Status', render: (p) => <Badge variant={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'active' : 'inactive'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="admin-table-actions">
          <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(p)}>Delete</Button>
        </div>
      ),
    },
  ];

  if (!plans) return <p>Loading plans&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Button onClick={openCreate}>Add plan</Button>
      </div>
      <Table columns={columns} rows={plans} getRowKey={(p) => p._id} emptyMessage="No plans yet." />

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit plan' : 'Add plan'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Name" required>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Description">
            <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="admin-form-grid">
            <FormField label="Price (R)" required>
              <input type="number" min={0} step="0.01" value={form.priceRand} onChange={(e) => setForm((f) => ({ ...f, priceRand: e.target.value }))} />
            </FormField>
            <FormField label="Period (days)" required>
              <input type="number" min={1} value={form.periodDays} onChange={(e) => setForm((f) => ({ ...f, periodDays: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Credits per period" required>
            <input type="number" min={1} value={form.creditsPerPeriod} onChange={(e) => setForm((f) => ({ ...f, creditsPerPeriod: e.target.value }))} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this plan?"
        summary={deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. This is blocked while it has active subscribers.` : ''}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
