import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { Button, FormField } from '../../design-system';
import { useDocumentMeta } from '../../lib/useDocumentMeta.js';
import '../auth/AuthForm.css';

const PRESET_AMOUNTS_RAND = [100, 250, 500, 1000];
const RETRY_MESSAGES = {
  cancelled: 'You cancelled the previous payment — feel free to try again.',
  failed: 'The previous payment could not be processed — please try again.',
};

export function GiftCardPurchasePage() {
  const { isAuthenticated, user } = useAuth();
  useDocumentMeta('Gift cards', 'Buy a NailsByMandisa gift card for yourself or a friend.', { path: '/gift-cards/purchase' });
  const [searchParams] = useSearchParams();
  const retryStatus = searchParams.get('status');
  const [amountRand, setAmountRand] = useState(String(PRESET_AMOUNTS_RAND[1]));
  const [purchaserEmail, setPurchaserEmail] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { payment } = await apiClient.post('/gift-cards/purchase', {
        amountCents: Math.round(Number(amountRand) * 100),
        purchaserEmail: isAuthenticated ? undefined : purchaserEmail,
        recipientEmail: recipientEmail || null,
      });
      window.location.href = payment.redirectUrl;
    } catch (err) {
      setError(err.message || 'Could not start your purchase. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Buy a gift card</h1>
      {retryStatus && RETRY_MESSAGES[retryStatus] && <p className="auth-form__footer">{RETRY_MESSAGES[retryStatus]}</p>}
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      <FormField label="Amount (R)" required>
        <select value={amountRand} onChange={(e) => setAmountRand(e.target.value)}>
          {PRESET_AMOUNTS_RAND.map((r) => (
            <option key={r} value={r}>
              R{r}
            </option>
          ))}
        </select>
      </FormField>
      {!isAuthenticated && (
        <FormField label="Your email" required hint="We'll send the gift card code here">
          <input type="email" value={purchaserEmail} onChange={(e) => setPurchaserEmail(e.target.value)} />
        </FormField>
      )}
      {isAuthenticated && <p>Sending to your account email: {user.email}</p>}
      <FormField label="Recipient email" hint="Optional — leave blank to buy it for yourself">
        <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
      </FormField>
      <Button type="submit" className="auth-form__submit" loading={submitting}>
        Continue to payment
      </Button>
    </form>
  );
}
