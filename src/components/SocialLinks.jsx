import { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient.js';
import './SocialLinks.css';

const ICONS = {
  instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M15 8.5h2V5h-2c-2.2 0-4 1.8-4 4v2H9v3.5h2V21h3.5v-6.5H17l.5-3.5h-3V9c0-.55.45-1 1-1Z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2 1.7 3.6 3.8 3.9v2.7c-1.4 0-2.7-.4-3.8-1.2v6.4c0 3.2-2.6 5.7-5.8 5.7-3.2 0-5.7-2.6-5.7-5.7 0-3.2 2.6-5.7 5.7-5.7.3 0 .6 0 .9.07v2.8a3 3 0 0 0-.9-.14 3 3 0 1 0 3 3V3h2.8Z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4 4l7.1 9.3L4.2 20h2.1l6-6.5 4.6 6.5H20l-7.4-9.7L19.2 4h-2.1l-5.6 6L7 4H4Z" />
    </svg>
  ),
};

const LABELS = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', twitter: 'X (Twitter)' };

// Reads from admin-editable SETTINGS.socialLinks rather than being hardcoded, matching
// the WhatsAppButton pattern — an owner can update these from /admin/homepage without a
// code change.
export function SocialLinks({ className = '' }) {
  const [links, setLinks] = useState(null);

  useEffect(() => {
    apiClient
      .get('/settings')
      .then(({ settings }) => setLinks(settings.socialLinks || {}))
      .catch(() => setLinks({}));
  }, []);

  const entries = Object.entries(links || {}).filter(([, url]) => url);
  if (!entries.length) return null;

  return (
    <div className={`social-links ${className}`}>
      {entries.map(([key, url]) => (
        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="social-links__item" aria-label={LABELS[key] || key}>
          {ICONS[key] || null}
        </a>
      ))}
    </div>
  );
}
