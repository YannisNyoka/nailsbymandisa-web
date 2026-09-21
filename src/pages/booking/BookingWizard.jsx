import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { Button, FormField, useToast } from '../../design-system';
import { useDocumentMeta } from '../../lib/useDocumentMeta.js';
import './BookingWizard.css';

const STEPS = ['Services', 'Staff', 'Date & time', 'Details', 'Review'];

function formatCents(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

function todayDateInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BookingWizard() {
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useDocumentMeta('Book an appointment', 'Book your manicure, pedicure, gel, acrylic or nail art appointment online.');

  const [stepIndex, setStepIndex] = useState(0);
  const [services, setServices] = useState(null);
  const [staff, setStaff] = useState(null);

  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [employeeId, setEmployeeId] = useState('any');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [slots, setSlots] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null); // { code, discountValueCents }
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [giftCardCodeInput, setGiftCardCodeInput] = useState('');
  const [allowGuestBooking, setAllowGuestBooking] = useState(true);

  useEffect(() => {
    apiClient
      .get('/settings')
      .then(({ settings }) => setAllowGuestBooking(settings.allowGuestBooking !== false))
      .catch(() => setAllowGuestBooking(true));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient
        .get('/loyalty/me')
        .then((ledger) => setPointsBalance(ledger.pointsBalance))
        .catch(() => setPointsBalance(0));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    Promise.all([apiClient.get('/services'), apiClient.get('/staff')])
      .then(([{ services: s }, { employees: e }]) => {
        setServices(s);
        setStaff(e);
        // Coming from a service card on the home page ("Our services" — /book?service=<id>)
        // pre-selects that service instead of dropping the visitor back at an empty list.
        const preselectId = searchParams.get('service');
        if (preselectId && s.some((service) => service._id === preselectId)) {
          setSelectedServiceIds([preselectId]);
        }
      })
      .catch((err) => showToast(err.message || 'Could not load services.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedServices = useMemo(
    () => (services || []).filter((s) => selectedServiceIds.includes(s._id)),
    [services, selectedServiceIds]
  );
  const totalDurationMinutes = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  // Client-side estimate only — the server recomputes this authoritatively when the
  // booking is created (§5.1), including any off-peak surcharge based on the chosen time.
  const estimatedPriceCents = selectedServices.reduce((sum, s) => sum + s.priceCents, 0);

  // Presentational filter only, mirroring bookingService's employeeCanPerform() — the
  // server independently re-validates staff capability when the booking is actually
  // created, so this can't be relied on as the source of truth, only to avoid showing a
  // staff member who obviously can't do the job.
  const eligibleStaff = useMemo(
    () =>
      (staff || []).filter(
        (e) => !e.serviceIds || selectedServiceIds.every((id) => e.serviceIds.some((sid) => sid === id))
      ),
    [staff, selectedServiceIds]
  );

  function toggleService(id) {
    setSelectedServiceIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function loadSlots(forDate) {
    setLoadingSlots(true);
    setStartTime('');
    try {
      const { slots: available } = await apiClient.get(
        `/appointments/slots?serviceIds=${selectedServiceIds.join(',')}&date=${forDate}&employeeId=${employeeId}`
      );
      setSlots(available);
    } catch (err) {
      showToast(err.message || 'Could not load available times.', { variant: 'error' });
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleDateChange(value) {
    setDate(value);
    if (value) loadSlots(value);
  }

  function canProceed() {
    if (stepIndex === 0) return selectedServiceIds.length > 0;
    if (stepIndex === 1) return Boolean(employeeId);
    if (stepIndex === 2) return Boolean(date && startTime);
    if (stepIndex === 3) {
      if (isAuthenticated) return true;
      if (!allowGuestBooking) return false; // must sign in/register first — see the blocked message rendered at this step
      return Boolean(guestInfo.name && guestInfo.email && guestInfo.phone);
    }
    return true;
  }

  async function checkDiscountCode() {
    if (!discountCodeInput) return;
    setCheckingDiscount(true);
    try {
      // Preview only — this doesn't redeem the code (no usage-limit slot spent yet).
      // The real, atomic redemption happens server-side inside the checkout call below.
      const result = await apiClient.post('/discount-codes/validate', {
        code: discountCodeInput,
        amountCents: estimatedPriceCents,
      });
      setAppliedDiscount({ code: discountCodeInput.toUpperCase(), discountValueCents: result.discountValueCents });
      showToast('Discount code applied.', { variant: 'success' });
    } catch (err) {
      setAppliedDiscount(null);
      showToast(err.message || 'That discount code is not valid.', { variant: 'error' });
    } finally {
      setCheckingDiscount(false);
    }
  }

  async function handleConfirm() {
    setSubmitting(true);
    let appointment;
    try {
      ({ appointment } = await apiClient.post('/appointments', {
        serviceIds: selectedServiceIds,
        date,
        startTime,
        employeeId,
        notes: notes || null,
        ...(isAuthenticated ? {} : { guestInfo }),
      }));
    } catch (err) {
      showToast(err.message || 'Could not complete your booking. Please try a different time.', { variant: 'error' });
      setSubmitting(false);
      return;
    }

    try {
      const { payment } = await apiClient.post(`/payments/appointments/${appointment._id}/checkout`, {
        ...(pointsToRedeem > 0 ? { pointsToRedeem } : {}),
        ...(appliedDiscount ? { discountCode: appliedDiscount.code } : {}),
        ...(giftCardCodeInput ? { giftCardCode: giftCardCodeInput } : {}),
      });
      window.location.href = payment.redirectUrl;
    } catch (err) {
      // The appointment already exists at this point (created above) — send them to the
      // same recovery page Yoco's own cancel/failure redirect uses, which retries
      // *payment* for this existing appointment. Just showing a toast and leaving them on
      // the wizard would strand them: clicking "Continue to payment" again re-submits
      // POST /appointments for a slot that's already theirs, and 409s.
      showToast(err.message || 'Something interrupted your payment — retrying.', { variant: 'error' });
      navigate(`/booking/payment?appointmentId=${appointment._id}&status=failed`);
    }
  }

  if (!services || !staff) return <p>Loading&hellip;</p>;

  return (
    <div className="booking-wizard">
      <ol className="booking-wizard__steps" aria-label="Booking progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i === stepIndex ? 'booking-wizard__step--active' : i < stepIndex ? 'booking-wizard__step--done' : ''}>
            {label}
          </li>
        ))}
      </ol>

      {stepIndex === 0 && (
        <section>
          <h2>Choose your services</h2>
          <ul className="booking-wizard__service-list">
            {services.map((s) => (
              <li key={s._id}>
                <label className="booking-wizard__service">
                  <input type="checkbox" checked={selectedServiceIds.includes(s._id)} onChange={() => toggleService(s._id)} />
                  <span className="booking-wizard__service-name">{s.name}</span>
                  <span className="booking-wizard__service-meta">
                    {s.durationMinutes} min &middot; {formatCents(s.priceCents)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {selectedServices.length > 0 && (
            <p className="booking-wizard__summary-line">
              Total: {totalDurationMinutes} min &middot; est. {formatCents(estimatedPriceCents)}
            </p>
          )}
        </section>
      )}

      {stepIndex === 1 && (
        <section>
          <h2>Choose your nail tech</h2>
          <div className="booking-wizard__staff-list">
            <label className="booking-wizard__staff-option">
              <input type="radio" name="employee" checked={employeeId === 'any'} onChange={() => setEmployeeId('any')} />
              Any available
            </label>
            {eligibleStaff.map((e) => (
              <label key={e._id} className="booking-wizard__staff-option">
                <input type="radio" name="employee" checked={employeeId === e._id} onChange={() => setEmployeeId(e._id)} />
                {e.name}
              </label>
            ))}
          </div>
        </section>
      )}

      {stepIndex === 2 && (
        <section>
          <h2>Pick a date and time</h2>
          <FormField label="Date" required>
            <input type="date" min={todayDateInputValue()} value={date} onChange={(e) => handleDateChange(e.target.value)} />
          </FormField>
          {date && loadingSlots && <p>Loading available times&hellip;</p>}
          {date && !loadingSlots && slots && slots.length === 0 && <p>No times available that day — try another date.</p>}
          {date && !loadingSlots && slots && slots.length > 0 && (
            <div className="booking-wizard__slots">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`booking-wizard__slot${startTime === slot ? ' booking-wizard__slot--selected' : ''}`}
                  onClick={() => setStartTime(slot)}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {stepIndex === 3 && (
        <section>
          <h2>Your details</h2>
          {isAuthenticated ? (
            <p>Booking as {user.firstName} {user.lastName} ({user.email}).</p>
          ) : !allowGuestBooking ? (
            <div className="booking-wizard__auth-required">
              <p>Please sign in or create an account to complete this booking.</p>
              <div className="booking-wizard__auth-required-actions">
                <Link to="/login" state={{ from: { pathname: '/book' } }}>
                  <Button type="button">Log in</Button>
                </Link>
                <Link to="/register" state={{ from: { pathname: '/book' } }}>
                  <Button type="button" variant="secondary">Create account</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <FormField label="Name" required>
                <input value={guestInfo.name} onChange={(e) => setGuestInfo((g) => ({ ...g, name: e.target.value }))} />
              </FormField>
              <FormField label="Email" required>
                <input type="email" value={guestInfo.email} onChange={(e) => setGuestInfo((g) => ({ ...g, email: e.target.value }))} />
              </FormField>
              <FormField label="Phone" required>
                <input type="tel" value={guestInfo.phone} onChange={(e) => setGuestInfo((g) => ({ ...g, phone: e.target.value }))} />
              </FormField>
            </>
          )}
          {(isAuthenticated || allowGuestBooking) && (
            <FormField label="Notes" hint="Optional — anything we should know?">
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          )}
        </section>
      )}

      {stepIndex === 4 && (
        <section>
          <h2>Review your booking</h2>
          <dl className="booking-wizard__review">
            <dt>Services</dt>
            <dd>{selectedServices.map((s) => s.name).join(', ')}</dd>
            <dt>With</dt>
            <dd>{employeeId === 'any' ? 'Any available' : staff.find((e) => e._id === employeeId)?.name}</dd>
            <dt>When</dt>
            <dd>{date} at {startTime}</dd>
            <dt>Estimated total</dt>
            <dd>{formatCents(estimatedPriceCents)} (final price and deposit confirmed at checkout)</dd>
          </dl>

          <FormField label="Discount code">
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                value={discountCodeInput}
                onChange={(e) => {
                  setDiscountCodeInput(e.target.value);
                  setAppliedDiscount(null);
                }}
                disabled={Boolean(appliedDiscount)}
              />
              <Button variant="secondary" onClick={checkDiscountCode} loading={checkingDiscount} disabled={Boolean(appliedDiscount) || !discountCodeInput}>
                Apply
              </Button>
            </div>
          </FormField>
          {appliedDiscount && <p className="booking-wizard__note">{appliedDiscount.code} applied: -{formatCents(appliedDiscount.discountValueCents)}</p>}

          {isAuthenticated && pointsBalance > 0 && (
            <FormField label={`Redeem points (${pointsBalance} available)`} hint="Applied toward your deposit, up to the salon's redemption cap">
              <input
                type="number"
                min={0}
                max={pointsBalance}
                value={pointsToRedeem}
                onChange={(e) => setPointsToRedeem(Math.max(0, Math.min(pointsBalance, Number(e.target.value))))}
              />
            </FormField>
          )}

          <FormField label="Gift card code" hint="Optional — its balance is applied to your deposit at checkout">
            <input value={giftCardCodeInput} onChange={(e) => setGiftCardCodeInput(e.target.value)} />
          </FormField>

          <p className="booking-wizard__note">
            A non-refundable deposit is required to confirm your booking. Any discount, points, or gift card balance is applied to the deposit amount at checkout — the exact charge is confirmed there. You'll be redirected to our secure payment provider next.
          </p>
        </section>
      )}

      <div className="booking-wizard__nav">
        <Button variant="secondary" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0 || submitting}>
          Back
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button onClick={() => setStepIndex((i) => i + 1)} disabled={!canProceed()}>
            Next
          </Button>
        ) : (
          <Button onClick={handleConfirm} loading={submitting}>
            Continue to payment
          </Button>
        )}
      </div>
    </div>
  );
}
