import { forwardRef } from 'react';
import './Button.css';

// §7.4 — every async button shows a loading state and disables itself while in flight.
// `loading` is a first-class prop, not something each call site has to remember to wire up.
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled = false, children, className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`ds-button ds-button--${variant} ds-button--${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="ds-button__spinner" aria-hidden="true" />}
      <span className={loading ? 'ds-button__label--loading' : undefined}>{children}</span>
    </button>
  );
});
