import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Button, ConfirmDialog, FormField, Modal, Table, useToast } from '../../design-system';
import './AdminPages.css';

const emptyForm = { employeeId: '', date: '', dateTo: '', bulk: false, startTime: '09:00', endTime: '17:00', reason: '' };

export function AdminAvailabilityPage() {
  const { showToast } = useToast();
  const [blocks, setBlocks] = useState(null);
  const [staff, setStaff] = useState([]);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { blocks: list } = await apiClient.get('/availability');
    setBlocks(list.sort((a, b) => (a.date > b.date ? 1 : -1)));
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load blocked slots.', { variant: 'error' }));
    apiClient.get('/staff').then(({ employees }) => setStaff(employees));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const employeeId = form.employeeId || null;
      if (form.bulk) {
        await apiClient.post('/availability/bulk', {
          employeeId,
          dateFrom: form.date,
          dateTo: form.dateTo,
          startTime: form.startTime,
          endTime: form.endTime,
          reason: form.reason || null,
        });
      } else {
        await apiClient.post('/availability', {
          employeeId,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          reason: form.reason || null,
        });
      }
      showToast('Slot(s) blocked.', { variant: 'success' });
      setCreating(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not block this slot.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    await apiClient.delete(`/availability/${deleteTarget._id}`);
    showToast('Block removed.', { variant: 'success' });
    await load();
  }

  const staffById = Object.fromEntries(staff.map((s) => [s._id, s]));

  const columns = [
    { key: 'scope', header: 'Applies to', render: (b) => (b.employeeId ? staffById[b.employeeId]?.name || 'Staff' : 'Whole salon') },
    { key: 'date', header: 'Date' },
    { key: 'time', header: 'Time', render: (b) => `${b.startTime}–${b.endTime}` },
    { key: 'reason', header: 'Reason', render: (b) => b.reason || '—' },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(b)}>Remove</Button>
      ),
    },
  ];

  if (!blocks) return <p>Loading blocked slots&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Button onClick={() => setCreating(true)}>Block time</Button>
      </div>
      <Table columns={columns} rows={blocks} getRowKey={(b) => b._id} emptyMessage="No blocked slots." />

      <Modal
        isOpen={creating}
        onClose={() => setCreating(false)}
        title="Block time off"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Block</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Applies to">
            <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}>
              <option value="">Whole salon</option>
              {staff.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input type="checkbox" checked={form.bulk} onChange={(e) => setForm((f) => ({ ...f, bulk: e.target.checked }))} />
            Block a date range
          </label>
          <div className="admin-form-grid">
            <FormField label={form.bulk ? 'From date' : 'Date'} required>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </FormField>
            {form.bulk && (
              <FormField label="To date" required>
                <input type="date" value={form.dateTo} onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))} />
              </FormField>
            )}
          </div>
          <div className="admin-form-grid">
            <FormField label="Start time" required>
              <input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
            </FormField>
            <FormField label="End time" required>
              <input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Reason">
            <input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove this block?"
        summary={deleteTarget ? `This slot will become bookable again: ${deleteTarget.date} ${deleteTarget.startTime}–${deleteTarget.endTime}.` : ''}
        confirmLabel="Remove"
        danger
      />
    </div>
  );
}
