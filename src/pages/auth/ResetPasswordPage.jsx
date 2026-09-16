import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useToast } from '../../design-system';
import { Button, FormField } from '../../design-system';
import './AuthForm.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/auth/password-reset/confirm', { token, newPassword });
      showToast('Your password has been reset. Please log in.', { variant: 'success' });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-form">
        <h1>Invalid link</h1>
        <p>This password reset link is missing its token.</p>
        <p className="auth-form__footer">
          <Link to="/forgot-password">Request a new link</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Choose a new password</h1>
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      <FormField label="New password" required hint="At least 10 characters">
        <input
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </FormField>
      <Button type="submit" className="auth-form__submit" loading={submitting}>
        Reset password
      </Button>
    </form>
  );
}
