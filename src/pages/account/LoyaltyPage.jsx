import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient.js';
import { useToast } from '../../design-system';
import './AccountPages.css';
import './LoyaltyPage.css';

export function LoyaltyPage() {
  const { showToast } = useToast();
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    apiClient
      .get('/loyalty/me')
      .then(setLedger)
      .catch((err) => showToast(err.message || 'Could not load your loyalty account.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ledger) return <p>Loading&hellip;</p>;

  const nextTier = ledger.tiers.find((t) => t.minLifetimePoints > ledger.tier.minLifetimePoints);
  const progressPercent = nextTier
    ? Math.min(100, Math.round(((ledger.lifetimePointsEarned - ledger.tier.minLifetimePoints) / (nextTier.minLifetimePoints - ledger.tier.minLifetimePoints)) * 100))
    : 100;

  return (
    <div className="account-page">
      <h1>Loyalty</h1>

      <section className="account-page__section loyalty-summary">
        <div className="loyalty-summary__balance">
          <span className="loyalty-summary__points">{ledger.pointsBalance}</span>
          <span className="loyalty-summary__label">points available</span>
        </div>
        <div className="loyalty-summary__tier">
          <div className="loyalty-summary__tier-row">
            <span>{ledger.tier.name}</span>
            {nextTier && <span>{nextTier.name}</span>}
          </div>
          <div className="loyalty-summary__progress-track">
            <div className="loyalty-summary__progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="loyalty-summary__hint">
            {nextTier
              ? `${nextTier.minLifetimePoints - ledger.lifetimePointsEarned} lifetime points to ${nextTier.name}`
              : "You've reached the top tier."}
          </p>
        </div>
      </section>

      <h2>Transaction history</h2>
      <ul className="loyalty-ledger">
        {ledger.transactions.length === 0 && <li>No activity yet.</li>}
        {ledger.transactions.map((t) => (
          <li key={t._id} className="loyalty-ledger__row">
            <span>{t.note || t.source.replace(/_/g, ' ')}</span>
            <span className={t.points > 0 ? 'loyalty-ledger__points--positive' : 'loyalty-ledger__points--negative'}>
              {t.points > 0 ? '+' : ''}
              {t.points}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
