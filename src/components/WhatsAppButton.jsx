import { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient.js';
import { buildWhatsAppLink } from '../lib/whatsapp.js';
import './WhatsAppButton.css';

// §4.11 — WhatsApp as a secondary contact channel: just a deep link (wa.me), no API
// integration needed. Reads the number from admin-editable SETTINGS (§2) rather than
// being hardcoded.
export function WhatsAppButton() {
  const [number, setNumber] = useState(null);

  useEffect(() => {
    apiClient
      .get('/settings')
      .then(({ settings }) => setNumber(settings.contact.whatsapp))
      .catch(() => setNumber(null));
  }, []);

  if (!number) return null;
  const href = buildWhatsAppLink(number, 'Hi! I have a question about booking with NailsByMandisa.');

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="whatsapp-button" aria-label="Chat with us on WhatsApp">
      <span className="whatsapp-button__tooltip" aria-hidden="true">Chat with us on WhatsApp</span>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="whatsapp-button__icon">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.48 1.32 5.01L2 22l5.25-1.38c1.47.8 3.12 1.22 4.8 1.22h.005c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.78 14.03c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11a16.3 16.3 0 0 1-1.65-.61c-2.9-1.25-4.79-4.17-4.93-4.37-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.27-.29.58-.36.78-.36.2 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.83 2 .9 2.15.07.15.12.32.02.51-.1.19-.15.31-.3.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.29.76 1.25 1.63 2.03 1.12 1 2.06 1.31 2.35 1.46.29.15.46.12.63-.07.17-.19.72-.84.92-1.13.19-.29.38-.24.64-.14.26.1 1.65.78 1.94.92.29.15.48.22.55.34.07.13.07.72-.17 1.4z" />
      </svg>
    </a>
  );
}
