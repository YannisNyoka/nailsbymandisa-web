import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/apiClient.js';
import { Button, FormField, useToast } from '../design-system';
import { useDocumentMeta } from '../lib/useDocumentMeta.js';
import './ContactPage.css';

export function ContactPage() {
  useDocumentMeta('Contact us', 'Get in touch with NailsByMandisa — ask a question, request a custom look, or just say hi.');
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

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
        <div className="contact-page__direct">
          <p>Prefer to reach us directly?</p>
          <a href="tel:+27766878843">076 687 8843</a>
          <a href="mailto:nailsbymandisa@gmail.com">nailsbymandisa@gmail.com</a>
        </div>
      </div>
    </main>
  );
}
