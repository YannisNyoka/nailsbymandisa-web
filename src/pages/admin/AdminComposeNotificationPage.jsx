import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Button, ConfirmDialog, FormField, useToast } from '../../design-system';
import './AdminPages.css';

export function AdminComposeNotificationPage() {
  const { showToast } = useToast();
  const [clients, setClients] = useState([]);
  const [mode, setMode] = useState('targeted'); // 'targeted' | 'broadcast'
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [alsoSms, setAlsoSms] = useState(false);
  const [confirmingBroadcast, setConfirmingBroadcast] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient.get('/admin/clients?pageSize=200').then(({ clients: list }) => setClients(list));
  }, []);

  async function send() {
    setSubmitting(true);
    try {
      const payload = { title, body, ...(mode === 'broadcast' ? { broadcast: true } : { userId, alsoSms }) };
      const result = await apiClient.post('/admin/notifications/send', payload);
      showToast(`Sent to ${result.sentCount} client${result.sentCount === 1 ? '' : 's'}.`, { variant: 'success' });
      setTitle('');
      setBody('');
    } catch (err) {
      showToast(err.message || 'Could not send.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'broadcast') {
      setConfirmingBroadcast(true);
      return;
    }
    await send();
  }

  const canSubmit = title && body && (mode === 'broadcast' || userId);

  return (
    <div>
      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 480 }}>
        <FormField label="Send to">
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="targeted">One client</option>
            <option value="broadcast">All clients (broadcast)</option>
          </select>
        </FormField>
        {mode === 'targeted' && (
          <FormField label="Client" required>
            <select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select a client&hellip;</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>{c.firstName} {c.lastName} ({c.email})</option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label="Title" required>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </FormField>
        <FormField label="Message" required>
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />
        </FormField>
        {mode === 'targeted' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <input type="checkbox" checked={alsoSms} onChange={(e) => setAlsoSms(e.target.checked)} />
            Also send by SMS (if they have a phone number on file)
          </label>
        )}
        <Button type="submit" loading={submitting} disabled={!canSubmit}>
          {mode === 'broadcast' ? 'Review & broadcast' : 'Send'}
        </Button>
      </form>

      <ConfirmDialog
        isOpen={confirmingBroadcast}
        onClose={() => setConfirmingBroadcast(false)}
        onConfirm={send}
        title="Broadcast to every client?"
        summary={`This sends "${title}" to every active client's notification center. This can't be undone.`}
        confirmLabel="Send broadcast"
        danger
      />
    </div>
  );
}
