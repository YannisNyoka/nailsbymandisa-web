import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Button, ConfirmDialog, useToast } from '../../design-system';
import './AdminPages.css';

const UNPAID_PAGE_SIZE = 50;

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Self-contained — fetches its own list of currently pending_payment appointments
// (never trusts whatever filters the host page's own table happens to have active) and
// owns its own Cancel/Delete actions, so it drops into both AdminOverviewPage and
// AdminAppointmentsPage unchanged. `onChange` lets a host page refresh its own data
// (e.g. the main appointments table, or the Overview stat cards) after an action here
// changes something it's also showing.
export function UnpaidAppointmentsBanner({ onChange }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [servicesById, setServicesById] = useState({});
  const [staffById, setStaffById] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    const result = await apiClient.get(`/appointments?status=pending_payment&pageSize=${UNPAID_PAGE_SIZE}`);
    setData(result);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  useEffect(() => {
    Promise.all([apiClient.get('/services'), apiClient.get('/staff')])
      .then(([{ services }, { employees }]) => {
        setServicesById(Object.fromEntries(services.map((s) => [s._id, s])));
        setStaffById(Object.fromEntries(employees.map((e) => [e._id, e])));
      })
      .catch(() => {});
  }, []);

  async function handleCancel() {
    try {
      await apiClient.post(`/appointments/${cancelTarget._id}/cancel`, { reason: 'Cancelled by admin' });
      showToast('Appointment cancelled.', { variant: 'success' });
      await load();
      await onChange?.();
    } catch (err) {
      showToast(err.message || 'Could not cancel this appointment.', { variant: 'error' });
      throw err;
    }
  }

  async function handleDelete() {
    try {
      await apiClient.delete(`/appointments/${deleteTarget._id}`);
      showToast('Unpaid appointment deleted.', { variant: 'success' });
      await load();
      await onChange?.();
    } catch (err) {
      showToast(err.message || 'Could not delete this appointment.', { variant: 'error' });
      throw err;
    }
  }

  if (!data || data.total === 0) return null;

  return (
    <div className="unpaid-banner">
      <div className="unpaid-banner__header">
        <span className="unpaid-banner__icon" aria-hidden="true">⚠️</span>
        <div>
          <h2 className="unpaid-banner__title">Unpaid Appointments — Admin Review Required</h2>
          <p className="unpaid-banner__subtitle">These bookings were started but payment was never completed.</p>
        </div>
        <span className="unpaid-banner__count">{data.total}</span>
      </div>
      <div className="unpaid-banner__table-wrapper">
        <table className="unpaid-banner__table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Date &amp; time</th>
              <th>Services</th>
              <th>Stylist</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.appointments.map((a) => (
              <tr key={a._id}>
                <td>
                  <div>{a.clientName || '—'}</div>
                  {a.clientEmail && <div className="admin-page__muted">{a.clientEmail}</div>}
                </td>
                <td>{a.date} <span className="admin-page__muted">{a.startTime}</span></td>
                <td>{a.serviceIds.map((id) => servicesById[id]?.name || '—').join(', ')}</td>
                <td>{staffById[a.employeeId]?.name || '—'}</td>
                <td>
                  <span className="unpaid-banner__created">{timeAgo(a.createdAt)}</span>
                </td>
                <td>
                  <div className="admin-table-actions">
                    <Button variant="secondary" size="sm" onClick={() => setCancelTarget(a)}>
                      Cancel
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(a)}>
                      🗑 Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel this appointment?"
        summary={cancelTarget ? `This cancels the ${cancelTarget.date} ${cancelTarget.startTime} booking and notifies the client. This bypasses the normal cancellation notice window.` : ''}
        confirmLabel="Cancel appointment"
        danger
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this unpaid appointment?"
        summary={deleteTarget ? `Permanently deletes the ${deleteTarget.date} ${deleteTarget.startTime} booking — it was never paid for, so unlike Cancel, this removes it entirely rather than keeping a record. The client is notified. This can't be undone.` : ''}
        confirmLabel="Delete permanently"
        danger
      />
    </div>
  );
}
