import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, ConfirmDialog, FormField, Modal, useToast } from '../../design-system';
import './AccountPages.css';

const STATUS_VARIANT = {
  pending_payment: 'warning',
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  no_show: 'danger',
};

function formatCents(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

export function BookingsPage() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState(null);
  const [servicesById, setServicesById] = useState({});
  const [staffById, setStaffById] = useState({});
  const [cancelTarget, setCancelTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const load = useCallback(async () => {
    const [{ appointments: list }, { services }, { employees }] = await Promise.all([
      apiClient.get('/appointments/me'),
      apiClient.get('/services'),
      apiClient.get('/staff'),
    ]);
    setAppointments(list);
    setServicesById(Object.fromEntries(services.map((s) => [s._id, s])));
    setStaffById(Object.fromEntries(employees.map((e) => [e._id, e])));
  }, []);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load your bookings.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(reason) {
    await apiClient.post(`/appointments/${cancelTarget._id}/cancel`, { reason: reason || null });
    showToast('Booking cancelled.', { variant: 'success' });
    await load();
  }

  if (!appointments) return <p>Loading your bookings&hellip;</p>;

  return (
    <div className="account-page">
      <h1>My bookings</h1>
      {appointments.length === 0 && <p>You don&rsquo;t have any bookings yet.</p>}
      <ul className="booking-list">
        {appointments.map((appt) => (
          <li key={appt._id} className="booking-card">
            <div className="booking-card__main">
              <div className="booking-card__services">
                {appt.serviceIds.map((id) => servicesById[id]?.name || 'Service').join(', ')}
              </div>
              <div className="booking-card__meta">
                {appt.date} · {appt.startTime}&ndash;{appt.endTime} with {staffById[appt.employeeId]?.name || 'staff'}
              </div>
              <div className="booking-card__meta">{formatCents(appt.totalPriceCents)}</div>
            </div>
            <div className="booking-card__side">
              <Badge variant={STATUS_VARIANT[appt.status] || 'neutral'}>{appt.status.replace('_', ' ')}</Badge>
              {(appt.status === 'pending_payment' || appt.status === 'confirmed') && (
                <div className="booking-card__actions">
                  <Button variant="secondary" size="sm" onClick={() => setRescheduleTarget(appt)}>
                    Reschedule
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setCancelTarget(appt)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => handleCancel()}
        title="Cancel this booking?"
        summary={
          cancelTarget
            ? `This will cancel your booking on ${cancelTarget.date} at ${cancelTarget.startTime}. Cancellation policy windows are enforced by the salon.`
            : ''
        }
        confirmLabel="Cancel booking"
        danger
      />

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onDone={async () => {
            setRescheduleTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function RescheduleModal({ appointment, onClose, onDone }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(appointment.date);
  const [startTime, setStartTime] = useState(appointment.startTime);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post(`/appointments/${appointment._id}/reschedule`, { date, startTime });
      showToast('Booking rescheduled.', { variant: 'success' });
      await onDone();
    } catch (err) {
      showToast(err.message || 'Could not reschedule this booking.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Reschedule booking"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Confirm new time
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Date" required>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Start time" required hint="24-hour format, e.g. 14:00">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </FormField>
      </form>
    </Modal>
  );
}
