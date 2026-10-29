import { useCallback, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge, Button, ConfirmDialog, FormField, Modal, Pagination, Table, useToast } from '../../design-system';
import './AdminPages.css';

const STATUS_VARIANT = {
  pending_payment: 'warning',
  confirmed: 'success',
  completed: 'neutral',
  cancelled: 'danger',
  no_show: 'danger',
};

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function AdminAppointmentsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [servicesById, setServicesById] = useState({});
  const [staffById, setStaffById] = useState({});
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [staffFilter, setStaffFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (dateFilter) params.set('date', dateFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (staffFilter) params.set('employeeId', staffFilter);
    if (serviceFilter) params.set('serviceId', serviceFilter);
    if (clientSearch) params.set('clientSearch', clientSearch);
    const result = await apiClient.get(`/appointments?${params.toString()}`);
    setData(result);
  }, [page, dateFilter, statusFilter, staffFilter, serviceFilter, clientSearch]);

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load appointments.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    Promise.all([apiClient.get('/services'), apiClient.get('/staff')])
      .then(([{ services: s }, { employees }]) => {
        setServices(s);
        setStaff(employees);
        setServicesById(Object.fromEntries(s.map((x) => [x._id, x])));
        setStaffById(Object.fromEntries(employees.map((x) => [x._id, x])));
      })
      .catch((err) => showToast(err.message || 'Could not load filter options.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel() {
    try {
      await apiClient.post(`/appointments/${cancelTarget._id}/cancel`, { reason: 'Cancelled by admin' });
      showToast('Appointment cancelled.', { variant: 'success' });
      await load();
    } catch (err) {
      showToast(err.message || 'Could not cancel this appointment.', { variant: 'error' });
      throw err;
    }
  }

  async function handleComplete() {
    try {
      await apiClient.post(`/appointments/${completeTarget._id}/complete`);
      showToast('Appointment marked completed.', { variant: 'success' });
      await load();
    } catch (err) {
      showToast(err.message || 'Could not mark this appointment completed.', { variant: 'error' });
      throw err;
    }
  }

  function exportRows() {
    return data.appointments.map((a) => ({
      client: a.clientName || '—',
      email: a.clientEmail || '—',
      services: a.serviceIds.map((id) => servicesById[id]?.name || '—').join('; '),
      staff: staffById[a.employeeId]?.name || '—',
      when: `${a.date} ${a.startTime}`,
      price: `R${(a.totalPriceCents / 100).toFixed(2)}`,
      status: a.status.replace('_', ' '),
    }));
  }

  function exportCsv() {
    const rows = exportRows();
    const header = ['Client', 'Email', 'Services', 'Staff', 'When', 'Price', 'Status'];
    const lines = [header, ...rows.map((r) => Object.values(r))].map((line) => line.map(csvEscape).join(','));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const rows = exportRows();
    const doc = new jsPDF();
    doc.text('NailsByMandisa — Appointments', 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [['Client', 'Email', 'Services', 'Staff', 'When', 'Price', 'Status']],
      body: rows.map((r) => Object.values(r)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [14, 12, 13] },
    });
    doc.save(`appointments-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const columns = [
    {
      key: 'client',
      header: 'Client',
      render: (a) => (
        <div>
          <div>{a.clientName || '—'}</div>
          {a.clientEmail && <div className="admin-page__muted">{a.clientEmail}</div>}
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Services',
      render: (a) => a.serviceIds.map((id) => servicesById[id]?.name || '—').join(', '),
    },
    { key: 'staff', header: 'Staff', render: (a) => staffById[a.employeeId]?.name || '—' },
    { key: 'when', header: 'When', render: (a) => `${a.date} ${a.startTime}` },
    { key: 'price', header: 'Price', render: (a) => `R${(a.totalPriceCents / 100).toFixed(2)}` },
    { key: 'status', header: 'Status', render: (a) => <Badge variant={STATUS_VARIANT[a.status] || 'neutral'}>{a.status.replace('_', ' ')}</Badge> },
    {
      key: 'actions',
      header: '',
      render: (a) =>
        !isStaff &&
        ['pending_payment', 'confirmed'].includes(a.status) && (
          <div className="admin-table-actions">
            <Button
              variant="secondary"
              size="sm"
              title="Edit"
              aria-label="Edit appointment"
              onClick={() => setEditTarget(a)}
            >
              ✎
            </Button>
            {a.status === 'confirmed' && (
              <Button
                variant="secondary"
                size="sm"
                title="Mark completed"
                aria-label="Mark appointment completed"
                onClick={() => setCompleteTarget(a)}
              >
                ✓
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              title="Cancel"
              aria-label="Cancel appointment"
              onClick={() => setCancelTarget(a)}
            >
              ✕
            </Button>
          </div>
        ),
    },
  ];

  if (!data) return <p>Loading appointments&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row">
        <Button variant="secondary" size="sm" onClick={exportCsv}>⬇ CSV</Button>
        <Button variant="secondary" size="sm" onClick={exportPdf}>⬇ PDF</Button>
      </div>
      <div className="admin-page__filters">
        <FormField label="Date">
          <input type="date" value={dateFilter} onChange={(e) => { setPage(1); setDateFilter(e.target.value); }} />
        </FormField>
        <FormField label="Status">
          <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
            <option value="">All</option>
            <option value="pending_payment">Pending payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </FormField>
        {!isStaff && (
          <FormField label="Staff">
            <select value={staffFilter} onChange={(e) => { setPage(1); setStaffFilter(e.target.value); }}>
              <option value="">All staff</option>
              {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Service">
          <select value={serviceFilter} onChange={(e) => { setPage(1); setServiceFilter(e.target.value); }}>
            <option value="">All services</option>
            {services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </FormField>
        <FormField label="Search client">
          <input
            type="search"
            placeholder="Name or email"
            value={clientSearch}
            onChange={(e) => { setPage(1); setClientSearch(e.target.value); }}
          />
        </FormField>
      </div>
      <Table columns={columns} rows={data.appointments} getRowKey={(a) => a._id} emptyMessage="No appointments match these filters." />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />

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
        isOpen={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleComplete}
        title="Mark this appointment completed?"
        summary={completeTarget ? `Marks the ${completeTarget.date} ${completeTarget.startTime} booking as completed — use this once the service has actually been rendered.` : ''}
        confirmLabel="Mark completed"
      />

      {editTarget && (
        <EditAppointmentModal
          appointment={editTarget}
          staff={staff}
          services={services}
          onClose={() => setEditTarget(null)}
          onDone={async () => {
            setEditTarget(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function formatCents(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

// Admin-only full edit: staff, status, services (with a live recomputed total/duration —
// changing services never touches depositCents, which is a flat setting, not derived
// from the services chosen; see bookingService.quoteBooking), date/time, payment status
// and notes. Goes through the same POST /:id/reschedule endpoint the customer-facing
// reschedule flow uses for the date/time/staff/services/notes part — an admin actor
// additionally bypasses the ownership check and the cancellation-notice-window lockout,
// and is the only actor allowed to send employeeId/serviceIds/notes at all
// (bookingService.js's assertOwnerOrAdmin / rescheduleAppointment). Status and payment
// status go through the same dedicated endpoints the icon actions use
// (/:id/complete, /:id/cancel) or the new cash-payment recording endpoint
// (/payments/appointments/:id/record-cash) — not a generic "set any field" endpoint.
//
// Scope deliberately stops short of what this could grow into: there's no way here to
// collect a remaining balance on an already-confirmed booking (only the initial
// pending-payment -> paid transition is supported) — that's a real, separate feature
// (its own payment record, not just a status label) left for later.
function EditAppointmentModal({ appointment, staff, services, onClose, onDone }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(appointment.date);
  const [startTime, setStartTime] = useState(appointment.startTime);
  const [employeeId, setEmployeeId] = useState(appointment.employeeId);
  const [selectedServiceIds, setSelectedServiceIds] = useState(appointment.serviceIds.map(String));
  const [notes, setNotes] = useState(appointment.notes || '');
  const [statusAction, setStatusAction] = useState('confirmed');
  const [paymentAction, setPaymentAction] = useState('unpaid');
  const [submitting, setSubmitting] = useState(false);

  const isPendingPayment = appointment.status === 'pending_payment';
  const isConfirmed = appointment.status === 'confirmed';

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s._id));
  const totalDurationMinutes = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalPriceCents = selectedServices.reduce((sum, s) => sum + s.priceCents, 0);

  function toggleService(id) {
    setSelectedServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (selectedServiceIds.length === 0) {
      showToast('Choose at least one service.', { variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      // Skip the date/time/services edit entirely when cancelling — nothing about those
      // matters once the booking is being cancelled, and re-quoting a "new" slot in the
      // same request would be pointless risk for zero benefit.
      if (statusAction !== 'cancelled') {
        await apiClient.post(`/appointments/${appointment._id}/reschedule`, {
          date,
          startTime,
          employeeId,
          serviceIds: selectedServiceIds,
          notes,
        });
      }
      if (isPendingPayment && paymentAction !== 'unpaid') {
        await apiClient.post(`/payments/appointments/${appointment._id}/record-cash`, { amount: paymentAction });
      }
      if (isConfirmed && statusAction === 'completed') {
        await apiClient.post(`/appointments/${appointment._id}/complete`);
      }
      if (isConfirmed && statusAction === 'cancelled') {
        await apiClient.post(`/appointments/${appointment._id}/cancel`, { reason: 'Cancelled by admin' });
      }
      showToast('Appointment updated.', { variant: 'success' });
      await onDone();
    } catch (err) {
      showToast(err.message || 'Could not update this appointment.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Edit ${appointment.clientName || appointment.clientEmail || 'booking'}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Staff" required>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {staff.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </FormField>

        {isConfirmed && (
          <FormField label="Status">
            <select value={statusAction} onChange={(e) => setStatusAction(e.target.value)}>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>
        )}

        <FormField label="Services" required>
          <div className="admin-appointments__service-checklist">
            {services.map((s) => (
              <label key={s._id} className="admin-appointments__service-option">
                <input type="checkbox" checked={selectedServiceIds.includes(s._id)} onChange={() => toggleService(s._id)} />
                {s.name} ({formatCents(s.priceCents)} &middot; {s.durationMinutes}min)
              </label>
            ))}
          </div>
        </FormField>
        {selectedServices.length > 0 && (
          <p className="admin-appointments__totals">
            Total: {formatCents(totalPriceCents)} &middot; Duration: {totalDurationMinutes} min
          </p>
        )}

        <FormField label="Date" required>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Start time" required hint="24-hour format, e.g. 14:00">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </FormField>

        {isPendingPayment && (
          <FormField
            label="Payment status"
            hint="Only for a cash/in-person payment — online payments confirm automatically."
          >
            <select value={paymentAction} onChange={(e) => setPaymentAction(e.target.value)}>
              <option value="unpaid">Unpaid</option>
              <option value="deposit">Deposit paid</option>
              <option value="full">Fully paid</option>
            </select>
          </FormField>
        )}
        {isConfirmed && <p className="admin-page__muted">Payment: deposit already paid.</p>}

        <FormField label="Notes">
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
      </form>
    </Modal>
  );
}
