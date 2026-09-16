import { useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient.js';
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
  const digits = number.replace(/[^\d]/g, '');
  const href = `https://wa.me/${digits}?text=${encodeURIComponent('Hi! I have a question about booking with NailsByMandisa.')}`;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="whatsapp-button" aria-label="Chat with us on WhatsApp">
      WhatsApp
    </a>
  );
}
