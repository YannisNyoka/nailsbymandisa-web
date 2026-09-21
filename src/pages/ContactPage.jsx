import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.js';
import { Button, FormField, useToast } from '../design-system';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';
import { formatHour } from '../lib/formatTime.js';
import './ContactPage.css';

const WEEKDAYS = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
];

export function ContactPage() {
  useDocumentMeta('Contact us', 'Get in touch with NailsByMandisa — ask a question, request a custom look, or just say hi.', { path: '/contact' });
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    apiClient
      .get('/settings')
      .then(({ settings: s }) => setSettings(s))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/contact', { name: name || undefined, email, message });
      setSent(true);
    } catch (err) {
      showToast(err.message || 'Could not send your message. Please try again.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="contact-page">
      <div className="contact-page__inner">
        <h1 className="contact-page__title">Contact us</h1>
        <div className="contact-page__divider" aria-hidden="true" />
        {sent ? (
          <div className="contact-page__sent">
            <p>Thanks{name ? `, ${name}` : ''} — we&rsquo;ve got your message and will be in touch soon.</p>
            <div className="contact-page__sent-actions">
              <Link to="/book">Book an appointment</Link>
              <Link to="/">Back to home</Link>
            </div>
          </div>
        ) : (
          <>
            <p className="contact-page__subtitle">Drop us a line!</p>
            <form className="contact-page__form" onSubmit={handleSubmit} noValidate>
              <FormField label="Name">
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </FormField>
              <FormField label="Email" required>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </FormField>
              <FormField label="Message" required>
                <textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} />
              </FormField>
              <Button type="submit" className="contact-page__submit" loading={submitting} disabled={!email || !message}>
                Send
              </Button>
            </form>
          </>
        )}
        {settings && (
          <div className="contact-page__direct">
            <p>Prefer to reach us directly?</p>
            <a href={`tel:${settings.contact.phone}`}>{settings.contact.phone}</a>
            <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>
          </div>
        )}

        {settings && (
          <section className="contact-page__policy">
            <h2>Cancellation Policy</h2>
            <p>
              We ask that you give us at least {settings.cancellationNoticeHours} hours&rsquo; notice if you need
              to cancel or reschedule your appointment.
            </p>
          </section>
        )}

        {settings && (
          <section className="contact-page__hours">
            <div>
              <h2>{settings.businessName}</h2>
              <a href={`tel:${settings.contact.phone}`}>{settings.contact.phone}</a>
              <p className="contact-page__address">{settings.contact.address}</p>
            </div>
            <div>
              <h2>Hours</h2>
              <dl>
                {WEEKDAYS.map(([key, label]) => (
                  <div key={key} className="contact-page__hours-row">
                    <dt>{label}</dt>
                    <dd>
                      {settings.hours[key].closed
                        ? 'Closed'
                        : `${formatHour(settings.hours[key].open)} – ${formatHour(settings.hours[key].close)}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
