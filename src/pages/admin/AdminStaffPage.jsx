import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, ConfirmDialog, FormField, Modal, Table, useToast } from '../../design-system';
import './AdminPages.css';

const WEEKDAYS = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];

function emptyWorkingHours() {
  return Object.fromEntries(WEEKDAYS.map(([key]) => [key, { closed: true, start: '09:00', end: '17:00' }]));
}

// UI simplification: one shift per day (the backend model supports split shifts, but a
// single-shift editor covers the common case; multi-shift editing can be added later
// without any API change).
function workingHoursToForm(workingHours) {
  const form = emptyWorkingHours();
  for (const [key] of WEEKDAYS) {
    const shift = workingHours?.[key]?.[0];
    form[key] = shift ? { closed: false, start: shift.start, end: shift.end } : { closed: true, start: '09:00', end: '17:00' };
  }
  return form;
}

function formToWorkingHours(form) {
  return Object.fromEntries(
    WEEKDAYS.map(([key]) => [key, form[key].closed ? [] : [{ start: form[key].start, end: form[key].end }]])
  );
}

const emptyForm = { name: '', bio: '', workingHours: emptyWorkingHours() };

export function AdminStaffPage() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { employees: list } = await apiClient.get('/staff');
    setEmployees(list);
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load staff.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditing({});
  }

  function openEdit(employee) {
    setForm({ name: employee.name, bio: employee.bio || '', workingHours: workingHoursToForm(employee.workingHours) });
    setEditing(employee);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { name: form.name, bio: form.bio || null, workingHours: formToWorkingHours(form.workingHours) };
      if (editing._id) {
        await apiClient.patch(`/staff/${editing._id}`, payload);
      } else {
        await apiClient.post('/staff', payload);
      }
      showToast('Staff member saved.', { variant: 'success' });
      setEditing(null);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not save staff member.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    await apiClient.delete(`/staff/${deleteTarget._id}`);
    showToast('Staff member deactivated.', { variant: 'success' });
    await load();
  }

  const columns = [
    { key: 'name', header: 'Name' },
    {
      key: 'workingDays',
      header: 'Working days',
      render: (e) => WEEKDAYS.filter(([key]) => e.workingHours?.[key]?.length > 0).map(([, label]) => label).join(', ') || '—',
    },
    { key: 'status', header: 'Status', render: (e) => <Badge variant={e.isActive ? 'success' : 'neutral'}>{e.isActive ? 'active' : 'inactive'}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <div className="admin-table-actions">
          <Button variant="secondary" size="sm" onClick={() => openEdit(e)}>Edit</Button>
          {e.isActive && (
            <Button variant="danger" size="sm" onClick={() => setDeleteTarget(e)}>Deactivate</Button>
          )}
        </div>
      ),
    },
  ];

  if (!employees) return <p>Loading staff&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Button onClick={openCreate}>Add staff member</Button>
      </div>
      <Table columns={columns} rows={employees} getRowKey={(e) => e._id} emptyMessage="No staff yet." />

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit staff member' : 'Add staff member'}
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
          <FormField label="Bio">
            <textarea rows={2} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
          </FormField>
          <p className="ds-field__label" style={{ marginBottom: 'var(--space-2)' }}>Working hours</p>
          {WEEKDAYS.map(([key, label]) => (
            <div key={key} className="admin-form-grid" style={{ alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  checked={!form.workingHours[key].closed}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      workingHours: { ...f.workingHours, [key]: { ...f.workingHours[key], closed: !e.target.checked } },
                    }))
                  }
                />
                {label}
              </label>
              {!form.workingHours[key].closed && (
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="time"
                    value={form.workingHours[key].start}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, workingHours: { ...f.workingHours, [key]: { ...f.workingHours[key], start: e.target.value } } }))
                    }
                  />
                  <input
                    type="time"
                    value={form.workingHours[key].end}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, workingHours: { ...f.workingHours, [key]: { ...f.workingHours[key], end: e.target.value } } }))
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate this staff member?"
        summary={deleteTarget ? `"${deleteTarget.name}" will no longer be bookable for new appointments.` : ''}
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
