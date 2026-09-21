import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Button, ConfirmDialog, FormField, useToast } from '../../design-system';
import './AdminPages.css';

export function AdminComposeNotificationPage() {
  const { showToast } = useToast();
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [mode, setMode] = useState('targeted'); // 'targeted' | 'broadcast'
  const [userId, setUserId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [alsoSms, setAlsoSms] = useState(false);
  const [confirmingBroadcast, setConfirmingBroadcast] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // §gap-fix — this used to preload every client at once with `pageSize=200`, which
  // always exceeded PAGINATION.MAX_LIMIT (100) and 400'd on every load, uncaught (no
  // `.catch()`) — the "one client" dropdown silently never had any options, the whole
  // targeted-notification path was unusable. Search-as-you-type instead: never loads
  // more than a page of results, and doesn't silently truncate the client list once the
  // salon has more than 100 customers (a plain preload-everything dropdown would).
  useEffect(() => {
    if (!clientSearch) {
      setClients([]);
      return;
    }
    let cancelled = false;
    apiClient
      .get(`/admin/clients?search=${encodeURIComponent(clientSearch)}&pageSize=20`)
      .then(({ clients: list }) => { if (!cancelled) setClients(list); })
      .catch((err) => { if (!cancelled) showToast(err.message || 'Could not search clients.', { variant: 'error' }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch]);

  async function send() {
    setSubmitting(true);
    try {
      const payload = { title, body, ...(mode === 'broadcast' ? { broadcast: true } : { userId, alsoSms }) };
      const result = await apiClient.post('/admin/notifications/send', payload);
      showToast(`Sent to ${result.sentCount} client${result.sentCount === 1 ? '' : 's'}.`, { variant: 'success' });
      setTitle('');
      setBody('');
      setSelectedClient(null);
      setUserId('');
      setClientSearch('');
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
          selectedClient ? (
            <FormField label="Client" required>
              <div className="admin-compose__selected-client">
                <span>{selectedClient.firstName} {selectedClient.lastName} ({selectedClient.email})</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedClient(null); setUserId(''); setClientSearch(''); }}
                >
                  Change
                </Button>
              </div>
            </FormField>
          ) : (
            <>
              <FormField label="Client" required hint="Type a name or email to search">
                <input
                  type="search"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search clients…"
                />
              </FormField>
              {clientSearch && (
                <ul className="admin-compose__client-results">
                  {clients.length === 0 && <li className="admin-page__muted">No matches.</li>}
                  {clients.map((c) => (
                    <li key={c._id}>
                      <button type="button" onClick={() => { setSelectedClient(c); setUserId(c._id); }}>
                        {c.firstName} {c.lastName} ({c.email})
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
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
