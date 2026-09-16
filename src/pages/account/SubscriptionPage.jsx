import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { Badge, Button, ConfirmDialog, useToast } from '../../design-system';
import './AccountPages.css';

const STATUS_VARIANT = { pending: 'warning', active: 'success', cancelled: 'neutral' };

export function SubscriptionPage() {
  const { showToast } = useToast();
  const [subscription, setSubscription] = useState(undefined);
  const [plansById, setPlansById] = useState({});
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    const [{ subscription: sub }, { plans }] = await Promise.all([
      apiClient.get('/subscriptions/me'),
      apiClient.get('/subscriptions/plans'),
    ]);
    setSubscription(sub);
    setPlansById(Object.fromEntries(plans.map((p) => [p._id, p])));
  }

  useEffect(() => {
    load().catch((err) => showToast(err.message || 'Could not load your subscription.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel() {
    await apiClient.post('/subscriptions/cancel');
    showToast('Subscription cancelled.', { variant: 'success' });
    await load();
  }

  if (subscription === undefined) return <p>Loading&hellip;</p>;

  return (
    <div className="account-page">
      <h1>Subscription</h1>
      {!subscription ? (
        <div className="account-page__section">
          <p>You don&rsquo;t have a membership yet.</p>
          <Link to="/subscriptions/plans" className="layout__cta-link">
            View plans
          </Link>
        </div>
      ) : (
        <div className="account-page__section">
          <p>
            <Badge variant={STATUS_VARIANT[subscription.status] || 'neutral'}>{subscription.status}</Badge>
          </p>
          <p>Plan: {plansById[subscription.planId]?.name || 'Unknown plan'}</p>
          <p>Credits remaining: {subscription.creditsRemaining}</p>
          {subscription.currentPeriodEnd && (
            <p>Renews/expires: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
          )}
          {subscription.status === 'active' && (
            <div className="admin-table-actions">
              <Link to="/subscriptions/plans" className="ds-button ds-button--secondary ds-button--md">
                Renew / change plan
              </Link>
              <Button variant="danger" onClick={() => setCancelling(true)}>
                Cancel subscription
              </Button>
            </div>
          )}
          {subscription.status === 'cancelled' && (
            <Link to="/subscriptions/plans" className="layout__cta-link">
              Resubscribe
            </Link>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={handleCancel}
        title="Cancel your subscription?"
        summary="Your remaining credits will no longer be usable, and you won't be charged again."
        confirmLabel="Cancel subscription"
        danger
      />
    </div>
  );
}
