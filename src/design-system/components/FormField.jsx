import { useId, cloneElement } from 'react';
import './FormField.css';

// §7.6 — every form input has a linked label. FormField owns the id/htmlFor/aria-describedby
// wiring so call sites can't forget it; pass the input/select/textarea as `children`.
export function FormField({ label, hint, error, required, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const field = cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
    required,
  });

  return (
    <div className="ds-field">
      <label htmlFor={id} className="ds-field__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {field}
      {hint && !error && (
        <p id={hintId} className="ds-field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="ds-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
