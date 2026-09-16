import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, useToast } from '../../design-system';
import './AccountPages.css';

const STATUS_VARIANT = { pending: 'warning', active: 'success', cancelled: 'neutral' };

export function GiftCardsPage() {
  const { showToast } = useToast();
  const [cards, setCards] = useState(null);

  useEffect(() => {
    apiClient
      .get('/gift-cards/me')
      .then(({ giftCards }) => setCards(giftCards))
      .catch((err) => showToast(err.message || 'Could not load your gift cards.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!cards) return <p>Loading&hellip;</p>;

  return (
    <div className="account-page">
      <div className="account-page__header-row">
        <h1>Gift cards</h1>
        <Link to="/gift-cards/purchase" className="layout__cta-link">
          Buy a gift card
        </Link>
      </div>
      {cards.length === 0 && <p>You haven&rsquo;t bought any gift cards yet.</p>}
      <ul className="booking-list">
        {cards.map((c) => (
          <li key={c._id} className="booking-card">
            <div className="booking-card__main">
              <div className="booking-card__services">{c.code}</div>
              <div className="booking-card__meta">
                R{(c.balanceCents / 100).toFixed(2)} remaining of R{(c.initialAmountCents / 100).toFixed(2)}
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[c.status] || 'neutral'}>{c.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
