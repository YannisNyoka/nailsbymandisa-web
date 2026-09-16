import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, ConfirmDialog, FormField, Modal, Table, useToast } from '../../design-system';
import './AdminPages.css';

const CATEGORIES = ['manicure', 'pedicure', 'gel', 'acrylic', 'polygel', 'nail_art', 'soak_off', 'extensions'];

const emptyForm = { name: '', category: 'gel', description: '', durationMinutes: 60, priceRand: '' };

export function AdminServicesPage() {
  const { showToast } = useToast();
  const [services, setServices] = useState(null);
  const [editing, setEditing] = useState(null); // null closed, {} for create, service object for edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { services: list } = await apiClient.get('/services');
    setServices(list);
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load services.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditing({});
  }

  function openEdit(service) {
    setForm({
      name: service.name,
      category: service.category,
      description: service.description || '',
      durationMinutes: service.durationMinutes,
      priceRand: (service.priceCents / 100).toString(),
      isActive: service.isActive,
    });
    setEditing(service);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description || null,
        durationMinutes: Number(form.durationMinutes),
        priceCents: Math.round(Number(form.priceRand) * 100),
      };
      if (editing._id) {
        await apiClient.patch(`/services/${editing._id}`, payload);
      } else {
        await apiClient.post('/services', payload);
      }
      showToast('Service saved.', { variant: 'success' });
      setEditing(null);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not save service.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    await apiClient.delete(`/services/${deleteTarget._id}`);
    showToast('Service deactivated.', { variant: 'success' });
    await load();
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (s) => s.category.replace('_', ' ') },
    { key: 'duration', header: 'Duration', render: (s) => `${s.durationMinutes} min` },
    { key: 'price', header: 'Price', render: (s) => `R${(s.priceCents / 100).toFixed(2)}` },
    { key: 'status', header: 'Status', render: (s) => <Badge variant={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'active' : 'inactive'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="admin-table-actions">
          <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>Edit</Button>
          {s.isActive && (
            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(s)}>Deactivate</Button>
          )}
        </div>
      ),
    },
  ];

  if (!services) return <p>Loading services&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Button onClick={openCreate}>Add service</Button>
      </div>
      <Table columns={columns} rows={services} getRowKey={(s) => s._id} emptyMessage="No services yet." />

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit service' : 'Add service'}
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
          <FormField label="Category" required>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace('_', ' ')}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Description">
            <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="admin-form-grid">
            <FormField label="Duration (minutes)" required>
              <input type="number" min={5} value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
            </FormField>
            <FormField label="Price (R)" required>
              <input type="number" min={0} step="0.01" value={form.priceRand} onChange={(e) => setForm((f) => ({ ...f, priceRand: e.target.value }))} />
            </FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate this service?"
        summary={deleteTarget ? `"${deleteTarget.name}" will no longer be bookable, but past bookings are unaffected.` : ''}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
