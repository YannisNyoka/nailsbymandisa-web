import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, FormField, useToast } from '../../design-system';
import './AuthForm.css';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    referralCode: searchParams.get('ref') || '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { welcomeDiscountCode } = await register({
        ...form,
        phone: form.phone || undefined,
        referralCode: form.referralCode || undefined,
      });
      if (welcomeDiscountCode) {
        showToast(`Welcome! Use code ${welcomeDiscountCode} for a discount on your first booking.`, {
          variant: 'success',
          duration: 10000,
        });
      }
      navigate('/account/bookings', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Create your account</h1>
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      <FormField label="First name" required>
        <input value={form.firstName} onChange={update('firstName')} autoComplete="given-name" />
      </FormField>
      <FormField label="Last name" required>
        <input value={form.lastName} onChange={update('lastName')} autoComplete="family-name" />
      </FormField>
      <FormField label="Email" required>
        <input type="email" value={form.email} onChange={update('email')} autoComplete="email" />
      </FormField>
      <FormField label="Phone" hint="Optional — used for booking reminders">
        <input type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
      </FormField>
      <FormField label="Password" required hint="At least 10 characters">
        <input type="password" value={form.password} onChange={update('password')} autoComplete="new-password" />
      </FormField>
      <FormField label="Referral code" hint="Optional — got a code from a friend?">
        <input value={form.referralCode} onChange={update('referralCode')} />
      </FormField>
      <Button type="submit" className="auth-form__submit" loading={submitting}>
        Create account
      </Button>
      <p className="auth-form__footer">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
