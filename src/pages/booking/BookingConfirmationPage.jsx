import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import './BookingConfirmationPage.css';

const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

export function BookingConfirmationPage() {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState(false);
  const attemptsRef = useRef(0);

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
    return (
      <div className="booking-confirmation booking-confirmation--success">
        <h1>Booking confirmed!</h1>
        <p>
          You&rsquo;re all set for {appointment.date} at {appointment.startTime}. We look forward to seeing you.
        </p>
        <Link to="/account/bookings">View my bookings</Link>
      </div>
    );
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
