import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { Button, FormField } from '../../design-system';
import './AuthForm.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/auth/password-reset/request', { email });
    } finally {
      // Always show the same confirmation regardless of outcome — the API deliberately
      // doesn't reveal whether the email is registered (avoids account enumeration).
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="auth-form">
        <h1>Check your email</h1>
        <p>If an account exists for {email}, we&rsquo;ve sent a link to reset your password.</p>
        <p className="auth-form__footer">
          <Link to="/login">Back to log in</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Reset your password</h1>
      <FormField label="Email" required>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <Button type="submit" className="auth-form__submit" loading={submitting}>
        Send reset link
      </Button>
      <p className="auth-form__footer">
        <Link to="/login">Back to log in</Link>
      </p>
    </form>
  );
}
