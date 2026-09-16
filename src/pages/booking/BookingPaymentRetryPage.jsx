import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { Button, useToast } from '../../design-system';
import './BookingConfirmationPage.css';

const MESSAGES = {
  cancelled: 'You cancelled the payment before it completed.',
  failed: 'Your payment could not be processed.',
};

export function BookingPaymentRetryPage() {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const status = searchParams.get('status');
  const { showToast } = useToast();
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      const { payment } = await apiClient.post(`/payments/appointments/${appointmentId}/checkout`);
      window.location.href = payment.redirectUrl;
    } catch (err) {
      showToast(err.message || 'Could not restart payment. Please contact us.', { variant: 'error' });
      setRetrying(false);
    }
  }

  return (
    <div className="booking-confirmation">
      <h1>Payment not completed</h1>
      <p>{MESSAGES[status] || 'Something interrupted your payment.'}</p>
      <p>Your booking slot is held but not yet confirmed — try paying again to secure it.</p>
      {appointmentId && (
        <Button onClick={handleRetry} loading={retrying}>
          Try payment again
        </Button>
      )}
      <div>
        <Link to="/">Back to home</Link>
      </div>
    </div>
  );
}
