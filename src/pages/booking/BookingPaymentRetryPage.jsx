import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useDocumentMeta } from '../../lib/useDocumentMeta.js';
import { Button, useToast } from '../../design-system';
import './BookingConfirmationPage.css';

const MESSAGES = {
  cancelled: 'You cancelled the payment before it completed.',
  failed: 'Your payment could not be processed.',
};

export function BookingPaymentRetryPage() {
  useDocumentMeta('Payment not completed', null, { noindex: true });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointmentId');
  const status = searchParams.get('status');
  const { showToast } = useToast();
  const [retrying, setRetrying] = useState(false);
  const [slotGone, setSlotGone] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      const { payment } = await apiClient.post(`/payments/appointments/${appointmentId}/checkout`);
      window.location.href = payment.redirectUrl;
    } catch (err) {
      showToast(err.message || 'Could not restart payment. Please contact us.', { variant: 'error' });
      setRetrying(false);
      // A booking only holds its slot for a limited time — if that's passed (or the
      // appointment's otherwise no longer awaiting payment), retrying again here would
      // just repeat the same 409 forever. Send them back to pick a time rather than
      // stranding them on a "try again" button that can never succeed.
      if (err.status === 409 || err.status === 400) setSlotGone(true);
    }
  }

  return (
    <div className="booking-confirmation">
      <h1>Payment not completed</h1>
      <p>{MESSAGES[status] || 'Something interrupted your payment.'}</p>
      {slotGone ? (
        <>
          <p>That booking is no longer available — please choose a time again.</p>
          <Button onClick={() => navigate('/book')}>Book again</Button>
        </>
      ) : (
        <>
          <p>Your booking slot is held but not yet confirmed — try paying again to secure it.</p>
          {appointmentId && (
            <Button onClick={handleRetry} loading={retrying}>
              Try payment again
            </Button>
          )}
        </>
      )}
      <div>
        <Link to="/">Back to home</Link>
      </div>
    </div>
  );
}
