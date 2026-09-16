import './Badge.css';

export function Badge({ variant = 'neutral', children }) {
  return <span className={`ds-badge ds-badge--${variant}`}>{children}</span>;
}
