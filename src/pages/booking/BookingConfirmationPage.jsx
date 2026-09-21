import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { useDocumentMeta } from '../../lib/useDocumentMeta.js';
import { Button } from '../../design-system';
import './BookingConfirmationPage.css';

const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

function addMinutesToTime(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + (mins || 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function toCalDateStr(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(/:/g, '')}00`;
}
function pad2(n) {
  return String(n).padStart(2, '0');
}
function nowAsCalDateStr() {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}00Z`;
}

function downloadICS({ date, startTime, endTime, title, description, location }) {
  const start = toCalDateStr(date, startTime);
  const end = toCalDateStr(date, endTime);
  if (!start || !end) return;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NailsByMandisa//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:nbm-${Date.now()}@nailsbymandisa.com`,
    `DTSTAMP:${nowAsCalDateStr()}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT60M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${title}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })),
    download: 'nailsbymandisa-appointment.ics',
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function openGoogleCalendar({ date, startTime, endTime, title, description, location }) {
  const start = toCalDateStr(date, startTime);
  const end = toCalDateStr(date, endTime);
  if (!start || !end) return;
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}`, details: description, location });
  window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank', 'noopener,noreferrer');
}

function AddToCalendarButton({ date, startTime, endTime, title, description, location }) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);
  const calArgs = { date, startTime, endTime, title, description, location };
  const disabled = !date || !startTime;

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={dropRef} className="payment-receipt__calendar">
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => setOpen((o) => !o)}>
        📅 Add to calendar
      </Button>
      {open && (
        <div className="payment-receipt__calendar-menu">
          <button type="button" onClick={() => { openGoogleCalendar(calArgs); setOpen(false); }}>
            🗓️ Google Calendar
          </button>
          <button type="button" onClick={() => { downloadICS(calArgs); setOpen(false); }}>
            📲 Apple / Outlook
          </button>
        </div>
      )}
    </div>
  );
}

function formatDuration(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h}h` : '', m ? `${m}min` : ''].filter(Boolean).join(' ') || `${mins}min`;
}

function formatCents(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

function PaymentReceipt({ appointment, services, staff, payment, settings }) {
  const { user } = useAuth();
  const serviceNames = services
    ? appointment.serviceIds.map((id) => services.find((s) => s._id === id)?.name).filter(Boolean)
    : [];
  const stylistName = staff?.find((e) => e._id === appointment.employeeId)?.name || '';
  const clientName = user ? `${user.firstName} ${user.lastName}`.trim() : (appointment.guestInfo?.name ?? 'Client');
  const durationStr = formatDuration(appointment.totalDurationMinutes);
  // Only a paid appointment holds its slot, but the deposit itself always credits the
  // full quoted amount toward the total regardless of any discount/points/gift-card
  // applied to fund it — see BookingWizard's own checkout copy. The balance the salon
  // still expects is unaffected by how the deposit was paid.
  const balanceDueCents = Math.max(0, appointment.totalPriceCents - appointment.depositCents);
  const amountChargedCents = payment?.amountCents ?? appointment.depositCents;

  const location = settings?.contact?.address || '';
  const description = [
    'Your NailsByMandisa appointment is confirmed.',
    serviceNames.length ? `Services: ${serviceNames.join(', ')}` : '',
    stylistName ? `Stylist: ${stylistName}` : '',
    'Please arrive on time.',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="payment-receipt">
      <div className="payment-receipt__success-ring">
        <span>&#10003;</span>
      </div>
      <h1 className="payment-receipt__heading">Payment successful!</h1>
      <p className="payment-receipt__subheading">
        You&rsquo;re all set for {appointment.date} at {appointment.startTime}. We look forward to seeing you.
      </p>

      <div className="payment-receipt__card">
        <div className="payment-receipt__card-header">{settings?.businessName || 'NailsByMandisa'}</div>
        <div className="payment-receipt__divider" />

        <div className="payment-receipt__details">
          <div className="payment-receipt__row">
            <span className="payment-receipt__label">Client</span>
            <span className="payment-receipt__value">{clientName}</span>
          </div>
          <div className="payment-receipt__row">
            <span className="payment-receipt__label">Date &amp; time</span>
            <span className="payment-receipt__value">
              {appointment.date} &middot; {appointment.startTime}
            </span>
          </div>
          {serviceNames.length > 0 && (
            <div className="payment-receipt__row">
              <span className="payment-receipt__label">Services</span>
              <span className="payment-receipt__value">{serviceNames.join(', ')}</span>
            </div>
          )}
          {stylistName && (
            <div className="payment-receipt__row">
              <span className="payment-receipt__label">Stylist</span>
              <span className="payment-receipt__value">{stylistName}</span>
            </div>
          )}
          {durationStr && (
            <div className="payment-receipt__row">
              <span className="payment-receipt__label">Duration</span>
              <span className="payment-receipt__value">{durationStr}</span>
            </div>
          )}
        </div>

        <div className="payment-receipt__divider" />

        <div className="payment-receipt__pricing">
          <div className="payment-receipt__pricing-row">
            <span>Total service price</span>
            <span>{formatCents(appointment.totalPriceCents)}</span>
          </div>
          <div className="payment-receipt__pricing-row">
            <span>Deposit charged</span>
            <span className="payment-receipt__paid">{formatCents(amountChargedCents)} &#10003;</span>
          </div>
          {payment?.discountCode && payment.discountValueCents > 0 && (
            <div className="payment-receipt__pricing-row payment-receipt__pricing-row--discount">
              <span>🎟️ Discount ({payment.discountCode})</span>
              <span>&minus;{formatCents(payment.discountValueCents)}</span>
            </div>
          )}
          {payment?.pointsRedeemed > 0 && (
            <div className="payment-receipt__pricing-row payment-receipt__pricing-row--discount">
              <span>⭐ Loyalty points ({payment.pointsRedeemed} pts)</span>
              <span>&minus;{formatCents(payment.redemptionValueCents)}</span>
            </div>
          )}
          {payment?.giftCardCode && payment.giftCardValueCents > 0 && (
            <div className="payment-receipt__pricing-row payment-receipt__pricing-row--discount">
              <span>🎁 Gift card ({payment.giftCardCode})</span>
              <span>&minus;{formatCents(payment.giftCardValueCents)}</span>
            </div>
          )}
          <div className="payment-receipt__pricing-row payment-receipt__pricing-row--balance">
            <span>Balance due at salon</span>
            <span>{formatCents(balanceDueCents)}</span>
          </div>
        </div>
      </div>

      <div className="payment-receipt__actions">
        <Link to="/book">
          <Button>Book another appointment</Button>
        </Link>
        <AddToCalendarButton
          date={appointment.date}
          startTime={appointment.startTime}
          endTime={appointment.endTime || addMinutesToTime(appointment.startTime, appointment.totalDurationMinutes)}
          title={`${settings?.businessName || 'NailsByMandisa'} Appointment`}
          description={description}
          location={location}
        />
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          🖨️ Print receipt
        </Button>
        <Link to="/account/bookings">
          <Button variant="ghost">View my bookings</Button>
        </Link>
      </div>
    </div>
  );
}

export function BookingConfirmationPage() {
  useDocumentMeta('Booking confirmation', null, { noindex: true });
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState(false);
  const attemptsRef = useRef(0);

  const [services, setServices] = useState(null);
  const [staff, setStaff] = useState(null);
  const [payment, setPayment] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !appointmentId) return undefined;

    let cancelled = false;
    let timer;

    async function poll() {
      try {
        const { appointment: fetched } = await apiClient.get(`/appointments/${appointmentId}`);
        if (cancelled) return;
        setAppointment(fetched);
        attemptsRef.current += 1;
        if (fetched.status === 'pending_payment' && attemptsRef.current < POLL_ATTEMPTS) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [appointmentId, isAuthenticated, authLoading]);

  // Once confirmed, load what the receipt needs — service/stylist names (the
  // appointment doc only stores their ids) and the payment doc (for the
  // discount/points/gift-card breakdown, since the appointment itself only knows the
  // deposit it quoted, not how that deposit ended up being funded).
  useEffect(() => {
    if (appointment?.status !== 'confirmed') return;
    Promise.all([apiClient.get('/services'), apiClient.get('/staff'), apiClient.get('/settings')])
      .then(([{ services: s }, { employees: e }, { settings: st }]) => {
        setServices(s);
        setStaff(e);
        setSettings(st);
      })
      .catch(() => {});
    if (appointment.paymentId) {
      apiClient
        .get(`/payments/${appointment.paymentId}`)
        .then(({ payment: p }) => setPayment(p))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment?.status]);

  if (!appointmentId) {
    return (
      <div className="booking-confirmation">
        <h1>Booking reference missing</h1>
        <p>We couldn&rsquo;t find a booking reference in this link.</p>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  // Guests have no account to authenticate a status lookup with — their confirmation
  // arrives by email once the webhook confirms payment (see paymentsService).
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="booking-confirmation">
        <h1>Thank you!</h1>
        <p>We&rsquo;re processing your payment. You&rsquo;ll receive a confirmation email as soon as it clears.</p>
        <Link to="/">Back to home</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-confirmation">
        <h1>Something went wrong</h1>
        <p>We couldn&rsquo;t look up this booking. Check your account&rsquo;s bookings list, or contact us.</p>
        <Link to="/account/bookings">My bookings</Link>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="booking-confirmation">
        <p>Checking your booking&hellip;</p>
      </div>
    );
  }

  if (appointment.status === 'confirmed') {
    return <PaymentReceipt appointment={appointment} services={services} staff={staff} payment={payment} settings={settings} />;
  }

  if (appointment.status === 'pending_payment') {
    return (
      <div className="booking-confirmation">
        <h1>Still processing&hellip;</h1>
        <p>Your payment is still being confirmed. This page will update automatically, or check back shortly.</p>
        <Link to="/account/bookings">My bookings</Link>
      </div>
    );
  }

  return (
    <div className="booking-confirmation">
      <h1>Booking not confirmed</h1>
      <p>This booking is currently &ldquo;{appointment.status.replace('_', ' ')}&rdquo;. If you expected a confirmation, please contact us.</p>
      <Link to="/account/bookings">My bookings</Link>
    </div>
  );
}
