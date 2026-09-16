import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, useToast } from '../../design-system';
import './AccountPages.css';

export function ReferralsPage() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient
      .get('/referrals/me')
      .then(setData)
      .catch((err) => showToast(err.message || 'Could not load your referrals.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <p>Loading&hellip;</p>;

  const shareLink = `${window.location.origin}/register?ref=${data.referralCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy — please copy the link manually.', { variant: 'error' });
    }
  }

  return (
    <div className="account-page">
      <h1>Refer a friend</h1>
      <section className="account-page__section">
        <h2>Your referral link</h2>
        <p>Share this with a friend — when they complete their first booking, you earn bonus points.</p>
        <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{shareLink}</p>
        <Button variant="secondary" onClick={copyLink}>
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </section>

      <h2>Your referrals</h2>
      <ul className="booking-list">
        {data.referrals.length === 0 && <li>You haven&rsquo;t referred anyone yet.</li>}
        {data.referrals.map((r, i) => (
          // eslint-disable-next-line react/no-array-index-key -- referrals carry no id in this summary view
          <li key={i} className="booking-card">
            <div className="booking-card__main">
              <div className="booking-card__meta">Referred {new Date(r.createdAt).toLocaleDateString()}</div>
            </div>
            <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{r.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
