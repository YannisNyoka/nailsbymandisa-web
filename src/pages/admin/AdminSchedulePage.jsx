import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, useToast } from '../../design-system';
import './AdminSchedulePage.css';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SLOT_MINUTES = 30;
const DAY_START = '07:00';
const DAY_END = '20:00';
const HOUR_SLOTS = Array.from({ length: 13 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`); // 07:00–19:00

const WEEKDAY_SHORT_FORMATTER = new Intl.DateTimeFormat('en-ZA', { weekday: 'short' });
const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short' });

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
  const [weekBlocks, setWeekBlocks] = useState([]);
  // Rolling 7-day window starting from the selected date (not Monday-aligned) — matches
  // "This Week" meaning "today through 6 days from now", so switching staff or hitting
  // Prev/Next always centers on where you're actually looking, not a fixed calendar week.
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(date, i));

  const loadWeek = useCallback(async () => {
    if (!selectedStaffId) return;
    const weekEnd = addDays(date, 6);
    // No employeeId filter here — a salon-wide block (employeeId: null) must still show for
    // this staff member, so filtering happens client-side (isWithinBlock), same as the
    // Daily Overview grid already does.
    const [results, { blocks: b }] = await Promise.all([
      Promise.all(weekDays.map((d) => apiClient.get(`/appointments?date=${d}&employeeId=${selectedStaffId}&pageSize=50`))),
      apiClient.get(`/availability?dateFrom=${date}&dateTo=${weekEnd}`),
    ]);
    setWeekAppointments(Object.fromEntries(weekDays.map((d, i) => [d, results[i].appointments.filter((a) => a.status !== 'cancelled')])));
    setWeekBlocks(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const selectedStaff = staff.find((s) => s._id === selectedStaffId);
  const weekRangeLabel = `${WEEKDAY_SHORT_FORMATTER.format(new Date(`${weekDays[0]}T00:00:00`))}, ${DAY_MONTH_FORMATTER.format(new Date(`${weekDays[0]}T00:00:00`))} – ${WEEKDAY_SHORT_FORMATTER.format(new Date(`${weekDays[6]}T00:00:00`))}, ${DAY_MONTH_FORMATTER.format(new Date(`${weekDays[6]}T00:00:00`))}`;
  const isCurrentWeek = date === toDateString(new Date());

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

      {mode === 'daily' ? (
        <div className="admin-schedule__date-nav">
          <Button size="sm" variant="secondary" onClick={() => setDate((d) => addDays(d, -1))}>‹ Prev</Button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button size="sm" variant="secondary" onClick={() => setDate((d) => addDays(d, 1))}>Next ›</Button>
          <Button size="sm" variant="secondary" onClick={() => setDate(toDateString(new Date()))}>Today</Button>
        </div>
      ) : (
        !isStaff && (
          <div className="admin-schedule__staff-chips">
            {staff.map((s) => (
              <button
                key={s._id}
                type="button"
                className={`admin-schedule__staff-chip${selectedStaffId === s._id ? ' admin-schedule__staff-chip--active' : ''}`}
                onClick={() => setSelectedStaffId(s._id)}
              >
                <span className="admin-schedule__staff-avatar" aria-hidden="true">{s.name.charAt(0).toUpperCase()}</span>
                {s.name}
              </button>
            ))}
          </div>
        )
      )}

      {mode === 'weekly' && (
        <div className="admin-schedule__date-nav">
          <Button size="sm" variant="secondary" onClick={() => setDate((d) => addDays(d, -7))}>‹ Prev Week</Button>
          <span className="admin-schedule__week-range">{weekRangeLabel}</span>
          <Button size="sm" variant="secondary" onClick={() => setDate((d) => addDays(d, 7))}>Next Week ›</Button>
          <Button size="sm" variant={isCurrentWeek ? 'primary' : 'secondary'} onClick={() => setDate(toDateString(new Date()))}>
            This Week
          </Button>
          <Link to="/admin/staff"><Button size="sm" variant="secondary">⚙ Working Hours</Button></Link>
        </div>
      )}

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
      ) : !selectedStaff ? (
        <p>No active staff to schedule.</p>
      ) : (
        <div className="admin-schedule__grid-wrapper">
          <table className="admin-schedule__grid">
            <thead>
              <tr>
                <th>Time</th>
                {weekDays.map((d) => (
                  <th key={d}>
                    {WEEKDAY_SHORT_FORMATTER.format(new Date(`${d}T00:00:00`))}
                    <br />
                    {d.slice(8, 10)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOUR_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="admin-schedule__time-label">{slot}</td>
                  {weekDays.map((d) => {
                    const weekday = weekdayKeyFor(d);
                    const open = isWithinShift(slot, selectedStaff.workingHours?.[weekday]);
                    const blocked = open && isWithinBlock(slot, weekBlocks.filter((b) => b.date === d), selectedStaff._id);
                    const appt = open && !blocked && appointmentAt(slot, weekAppointments[d] || [], selectedStaff._id);
                    let cellClass = 'admin-schedule__cell--closed';
                    if (open) cellClass = 'admin-schedule__cell--open';
                    if (blocked) cellClass = 'admin-schedule__cell--blocked';
                    return (
                      <td key={d} className={`admin-schedule__cell ${cellClass}`}>
                        {blocked && 'Blocked'}
                        {appt && <span className="admin-schedule__appt-chip">{appt.clientName || 'Guest'}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
