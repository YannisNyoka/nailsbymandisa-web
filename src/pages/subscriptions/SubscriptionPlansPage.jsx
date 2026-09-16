import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { Button, useToast } from '../../design-system';
import { useDocumentMeta } from '../../lib/useDocumentMeta.js';
import './SubscriptionPlansPage.css';

const RETRY_MESSAGES = {
  cancelled: 'You cancelled the previous payment — feel free to try again.',
  failed: 'The previous payment could not be processed — please try again.',
};

export function SubscriptionPlansPage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  useDocumentMeta('Membership plans', 'Join a NailsByMandisa membership for booking credits every month.');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retryStatus = searchParams.get('status');
  const [plans, setPlans] = useState(null);
  const [subscribingId, setSubscribingId] = useState(null);

  useEffect(() => {
    apiClient
      .get('/subscriptions/plans')
      .then(({ plans: list }) => setPlans(list))
      .catch((err) => showToast(err.message || 'Could not load plans.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe(planId) {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/subscriptions/plans' } } });
      return;
    }
    setSubscribingId(planId);
    try {
      const { payment } = await apiClient.post('/subscriptions/subscribe', { planId });
      window.location.href = payment.redirectUrl;
    } catch (err) {
      showToast(err.message || 'Could not start your subscription.', { variant: 'error' });
      setSubscribingId(null);
    }
  }

  if (!plans) return <p>Loading plans&hellip;</p>;

  return (
    <div className="subscription-plans">
      <h1>Membership plans</h1>
      {retryStatus && RETRY_MESSAGES[retryStatus] && <p>{RETRY_MESSAGES[retryStatus]}</p>}
      {plans.length === 0 && <p>No membership plans are available right now.</p>}
      <div className="subscription-plans__grid">
        {plans.map((plan) => (
          <div key={plan._id} className="subscription-plan-card">
            <h2>{plan.name}</h2>
            {plan.description && <p>{plan.description}</p>}
            <p className="subscription-plan-card__price">R{(plan.priceCents / 100).toFixed(2)} / {plan.periodDays} days</p>
            <p>{plan.creditsPerPeriod} booking credits per period</p>
            <Button onClick={() => subscribe(plan._id)} loading={subscribingId === plan._id}>
              Subscribe
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
