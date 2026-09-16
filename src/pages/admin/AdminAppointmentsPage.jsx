import { useCallback, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge, Button, ConfirmDialog, FormField, Pagination, Table, useToast } from '../../design-system';
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
    Promise.all([apiClient.get('/services'), apiClient.get('/staff')]).then(([{ services: s }, { employees }]) => {
      setServices(s);
      setStaff(employees);
      setServicesById(Object.fromEntries(s.map((x) => [x._id, x])));
      setStaffById(Object.fromEntries(employees.map((x) => [x._id, x])));
    });
  }, []);

  async function handleCancel() {
    await apiClient.post(`/appointments/${cancelTarget._id}/cancel`, { reason: 'Cancelled by admin' });
    showToast('Appointment cancelled.', { variant: 'success' });
    await load();
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
        !isStaff && ['pending_payment', 'confirmed'].includes(a.status) && (
          <Button variant="danger" size="sm" onClick={() => setCancelTarget(a)}>
            Cancel
          </Button>
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
    </div>
  );
}
