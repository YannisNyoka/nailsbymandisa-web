import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, FormField } from '../../design-system';
import './AuthForm.css';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname ?? '/account/bookings', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <h1>Log in</h1>
      {error && (
        <p className="auth-form__error" role="alert">
          {error}
        </p>
      )}
      <FormField label="Email" required>
        <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </FormField>
      <FormField label="Password" required>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      <Button type="submit" className="auth-form__submit" loading={submitting}>
        Log in
      </Button>
      <p className="auth-form__footer">
        <Link to="/forgot-password">Forgot your password?</Link>
      </p>
      <p className="auth-form__footer">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </form>
  );
}
