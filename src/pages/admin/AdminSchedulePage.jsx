import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, useToast } from '../../design-system';
import './AdminSchedulePage.css';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const SLOT_MINUTES = 30;
const DAY_START = '07:00';
const DAY_END = '20:00';

function toDateString(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}
function weekdayKeyFor(dateStr) {
  return WEEKDAY_KEYS[new Date(`${dateStr}T00:00:00`).getDay()];
}
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function minutesToTime(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
function buildSlots() {
  const slots = [];
  for (let m = timeToMinutes(DAY_START); m < timeToMinutes(DAY_END); m += SLOT_MINUTES) slots.push(minutesToTime(m));
  return slots;
}
const SLOTS = buildSlots();

function isWithinShift(slot, shifts) {
  const t = timeToMinutes(slot);
  return (shifts || []).some((s) => t >= timeToMinutes(s.start) && t < timeToMinutes(s.end));
}
function isWithinBlock(slot, blocks, employeeId) {
  const t = timeToMinutes(slot);
  return blocks.some(
    (b) => (b.employeeId === null || b.employeeId === employeeId) && t >= timeToMinutes(b.startTime) && t < timeToMinutes(b.endTime)
  );
}
function appointmentAt(slot, appointments, employeeId) {
  const t = timeToMinutes(slot);
  return appointments.find(
    (a) => a.employeeId === employeeId && t >= timeToMinutes(a.startTime) && t < timeToMinutes(a.endTime) && a.status !== 'cancelled'
  );
}

export function AdminSchedulePage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const { showToast } = useToast();
  const [mode, setMode] = useState('daily');
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [staff, setStaff] = useState([]);
  const [servicesById, setServicesById] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(() => (isStaff ? user.employeeId : ''));

  useEffect(() => {
    Promise.all([apiClient.get('/staff'), apiClient.get('/services')]).then(([{ employees }, { services }]) => {
      // A linked staff login only ever sees their own column/schedule — never the rest of
      // the team's, even though /api/staff itself is public data.
      const visible = isStaff ? employees.filter((e) => String(e._id) === String(user.employeeId)) : employees.filter((e) => e.isActive);
      setStaff(visible);
      setServicesById(Object.fromEntries(services.map((s) => [s._id, s])));
      setSelectedStaffId((current) => current || (isStaff ? user.employeeId : employees[0]?._id) || '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDaily = useCallback(async () => {
    const [{ appointments: appts }, { blocks: b }] = await Promise.all([
      apiClient.get(`/appointments?date=${date}&pageSize=100`),
      apiClient.get(`/availability?dateFrom=${date}&dateTo=${date}`),
    ]);
    setAppointments(appts);
    setBlocks(b);
  }, [date]);

  const [weekAppointments, setWeekAppointments] = useState({});
  const loadWeek = useCallback(async () => {
    if (!selectedStaffId) return;
    const weekStart = addDays(date, -((new Date(`${date}T00:00:00`).getDay() + 6) % 7)); // Monday of this week
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const results = await Promise.all(
      days.map((d) => apiClient.get(`/appointments?date=${d}&employeeId=${selectedStaffId}&pageSize=50`))
    );
    setWeekAppointments(Object.fromEntries(days.map((d, i) => [d, results[i].appointments.filter((a) => a.status !== 'cancelled')])));
  }, [date, selectedStaffId]);

  useEffect(() => {
    if (mode === 'daily') {
      loadDaily().catch((err) => showToast(err.message || 'Could not load the schedule.', { variant: 'error' }));
    } else {
      loadWeek().catch((err) => showToast(err.message || 'Could not load the schedule.', { variant: 'error' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, loadDaily, loadWeek]);

  function serviceNames(a) {
    return a.serviceIds.map((id) => servicesById[id]?.name || '—').join(', ');
  }

  const weekStart = addDays(date, -((new Date(`${date}T00:00:00`).getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div>
      <div className="admin-page__header-row">
        <div className="admin-schedule__mode-toggle">
          <Button size="sm" variant={mode === 'daily' ? 'primary' : 'secondary'} onClick={() => setMode('daily')}>
            📆 Daily overview
          </Button>
          <Button size="sm" variant={mode === 'weekly' ? 'primary' : 'secondary'} onClick={() => setMode('weekly')}>
            👤 Per-staff weekly
          </Button>
        </div>
      </div>

      <div className="admin-schedule__date-nav">
        <Button size="sm" variant="secondary" onClick={() => setDate((d) => addDays(d, mode === 'daily' ? -1 : -7))}>‹ Prev</Button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button size="sm" variant="secondary" onClick={() => setDate((d) => addDays(d, mode === 'daily' ? 1 : 7))}>Next ›</Button>
        <Button size="sm" variant="secondary" onClick={() => setDate(toDateString(new Date()))}>Today</Button>
        {mode === 'weekly' && !isStaff && (
          <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {mode === 'daily' ? (
        staff.length === 0 ? (
          <p>No active staff to schedule.</p>
        ) : (
          <div className="admin-schedule__grid-wrapper">
            <table className="admin-schedule__grid">
              <thead>
                <tr>
                  <th>Time</th>
                  {staff.map((s) => (
                    <th key={s._id}>
                      {s.name}
                      <span className="admin-page__muted"> · {appointments.filter((a) => a.employeeId === s._id && a.status !== 'cancelled').length} appts</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((slot) => (
                  <tr key={slot}>
                    <td className="admin-schedule__time-label">{slot}</td>
                    {staff.map((s) => {
                      const weekday = weekdayKeyFor(date);
                      const open = isWithinShift(slot, s.workingHours?.[weekday]);
                      const blocked = open && isWithinBlock(slot, blocks, s._id);
                      const appt = open && !blocked && appointmentAt(slot, appointments, s._id);
                      let cellClass = 'admin-schedule__cell--closed';
                      let content = '';
                      if (open && !blocked && !appt) cellClass = 'admin-schedule__cell--open';
                      if (blocked) { cellClass = 'admin-schedule__cell--blocked'; content = 'Blocked'; }
                      if (appt) { cellClass = 'admin-schedule__cell--booked'; content = `${appt.clientName || 'Guest'} — ${serviceNames(appt)}`; }
                      return <td key={s._id} className={`admin-schedule__cell ${cellClass}`}>{content}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="admin-schedule__week-grid">
          {weekDays.map((d) => (
            <div key={d} className="admin-schedule__week-day">
              <p className="admin-schedule__week-day-label">{WEEKDAY_LABELS[weekdayKeyFor(d)]} {d.slice(5)}</p>
              {(weekAppointments[d] || []).length === 0 && <p className="admin-page__muted">No bookings</p>}
              {(weekAppointments[d] || []).map((a) => (
                <div key={a._id} className="admin-schedule__week-appt">
                  <strong>{a.startTime}</strong> {a.clientName || 'Guest'} — {serviceNames(a)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
