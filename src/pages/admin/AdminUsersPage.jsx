import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge, Button, ConfirmDialog, FormField, Modal, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

// Mirrors api/src/config/constants.js PERMISSIONS — kept as plain strings here rather than
// shared code since the frontend has no access to backend source, matching how every other
// admin form in this app (e.g. discount code types) hand-mirrors its backend enum.
const PERMISSION_LABELS = {
  manage_appointments: 'Appointments',
  manage_staff: 'Staff (service providers)',
  manage_services: 'Services',
  manage_availability: 'Availability',
  manage_payments: 'Payments & refunds',
  manage_discounts: 'Discount codes',
  manage_gift_cards: 'Gift cards',
  manage_loyalty: 'Loyalty',
  manage_gallery: 'Gallery',
  manage_clients: 'Clients',
  manage_settings: 'Settings',
  send_notifications: 'Send notifications',
  manage_enquiries: 'Contact-form enquiries',
  view_analytics: 'Analytics & activity',
  manage_admin_users: 'Admin users (this page)',
};
const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);

function PermissionChecklist({ selected, onChange }) {
  function toggle(permission) {
    onChange(
      selected.includes(permission) ? selected.filter((p) => p !== permission) : [...selected, permission]
    );
  }
  return (
    <div className="admin-permission-checklist">
      {ALL_PERMISSIONS.map((permission) => (
        <label key={permission} className="admin-permission-checklist__item">
          <input type="checkbox" checked={selected.includes(permission)} onChange={() => toggle(permission)} />
          {PERMISSION_LABELS[permission]}
        </label>
      ))}
    </div>
  );
}

const emptyInviteForm = { email: '', firstName: '', lastName: '', permissions: [], role: 'admin', employeeId: '' };

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState(emptyInviteForm);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editPermissions, setEditPermissions] = useState([]);
  const [revokeTarget, setRevokeTarget] = useState(null);

  async function load() {
    setData(await apiClient.get(`/admin/users?page=${page}&pageSize=20`));
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load admin users.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    apiClient.get('/staff').then(({ employees: all }) => setEmployees(all.filter((e) => e.isActive)));
  }, []);

  const employeesById = Object.fromEntries(employees.map((e) => [e._id, e]));

  async function handleInvite(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/admin/users', {
        email: inviteForm.email,
        firstName: inviteForm.firstName || undefined,
        lastName: inviteForm.lastName || undefined,
        role: inviteForm.role,
        permissions: inviteForm.role === 'staff' ? [] : inviteForm.permissions,
        employeeId: inviteForm.role === 'staff' ? inviteForm.employeeId : undefined,
      });
      showToast(inviteForm.role === 'staff' ? 'Staff access granted.' : 'Admin access granted.', { variant: 'success' });
      setInviting(false);
      setInviteForm(emptyInviteForm);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not grant access.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePermissions(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.patch(`/admin/users/${editing._id}`, { permissions: editPermissions });
      showToast('Permissions updated.', { variant: 'success' });
      setEditing(null);
      await load();
    } catch (err) {
      showToast(err.message || 'Could not update permissions.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke() {
    await apiClient.post(`/admin/users/${revokeTarget._id}/revoke`);
    showToast('Admin access revoked.', { variant: 'success' });
    await load();
  }

  const columns = [
    { key: 'name', header: 'Name', render: (u) => `${u.firstName} ${u.lastName}` },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (u) =>
        u.role === 'staff' ? (
          <span>Staff — {employeesById[u.employeeId]?.name || 'unlinked'}</span>
        ) : (
          <span>Admin</span>
        ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (u) =>
        u.role === 'staff' ? (
          <span className="admin-page__muted">Own appointments/schedule/overview only</span>
        ) : u.permissions.length === 0 ? (
          <span className="admin-page__muted">None yet</span>
        ) : (
          <span>{u.permissions.length} granted</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (u) =>
        u._id === currentUser._id ? (
          <span className="admin-page__muted">That's you</span>
        ) : (
          <div className="admin-table-actions">
            {u.role !== 'staff' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditPermissions(u.permissions);
                  setEditing(u);
                }}
              >
                Edit permissions
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setRevokeTarget(u)}>
              Revoke
            </Button>
          </div>
        ),
    },
  ];

  if (!data) return <p>Loading admin users&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Button onClick={() => setInviting(true)}>Grant access</Button>
      </div>
      <p className="admin-page__muted" style={{ marginTop: `calc(-1 * var(--space-4))`, marginBottom: 'var(--space-4)' }}>
        Admin access only gets the specific permissions checked at invite time — never
        blanket access. Staff access is scoped automatically to that person's own
        appointments, schedule and overview. You can't edit or revoke your own access here;
        ask another admin.
      </p>
      <Table columns={columns} rows={data.adminUsers} getRowKey={(u) => u._id} emptyMessage="No admin users yet." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />

      <Modal
        isOpen={inviting}
        onClose={() => setInviting(false)}
        title="Grant admin or staff access"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviting(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleInvite} loading={submitting}>Grant access</Button>
          </>
        }
      >
        <form onSubmit={handleInvite} noValidate>
          <FormField label="Email" required hint="If this email already has an account, it's promoted in place. Otherwise a new account is created and they're emailed a link to set their password.">
            <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} />
          </FormField>
          <div className="admin-form-grid">
            <FormField label="First name" hint="Only needed for a brand-new account">
              <input value={inviteForm.firstName} onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))} />
            </FormField>
            <FormField label="Last name" hint="Only needed for a brand-new account">
              <input value={inviteForm.lastName} onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Access type" required>
            <select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}>
              <option value="admin">Admin — pick specific permissions below</option>
              <option value="staff">Staff — sees only their own appointments/schedule/overview</option>
            </select>
          </FormField>
          {inviteForm.role === 'staff' ? (
            <FormField label="Which staff member" required hint="Links this login to their staff/employee record — that's how the dashboard knows which bookings are theirs.">
              <select value={inviteForm.employeeId} onChange={(e) => setInviteForm((f) => ({ ...f, employeeId: e.target.value }))}>
                <option value="">Select…</option>
                {employees.map((emp) => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
              </select>
            </FormField>
          ) : (
            <>
              <p className="ds-field__label" style={{ marginBottom: 'var(--space-2)' }}>Permissions</p>
              <PermissionChecklist selected={inviteForm.permissions} onChange={(permissions) => setInviteForm((f) => ({ ...f, permissions }))} />
            </>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Edit permissions — ${editing.firstName} ${editing.lastName}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSavePermissions} loading={submitting}>Save</Button>
          </>
        }
      >
        <form onSubmit={handleSavePermissions} noValidate>
          <PermissionChecklist selected={editPermissions} onChange={setEditPermissions} />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke admin access?"
        summary={
          revokeTarget
            ? `"${revokeTarget.firstName} ${revokeTarget.lastName}" will lose all admin permissions and become a regular customer account. They can be re-granted access later.`
            : ''
        }
        confirmLabel="Revoke access"
        danger
      />
    </div>
  );
}
