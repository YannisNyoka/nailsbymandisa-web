import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, SimpleLineChart, SimpleBarChart, RankedBarList, Table, useToast } from '../../design-system';
import './AdminAnalyticsPage.css';

function formatCents(cents) {
  return `R${(cents / 100).toFixed(0)}`;
}

const RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
];

const BOOKINGS_SERIES = [
  { key: 'booked', label: 'Booked', color: 'var(--color-accent)' },
  { key: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' },
  { key: 'completed', label: 'Completed', color: 'var(--color-success)' },
];

function AnalyticsStatCard({ icon, iconVariant, label, value, sublabel }) {
  return (
    <div className="analytics-stat-card">
      <div className="analytics-stat-card__top">
        <span className="analytics-stat-card__label">{label}</span>
        <span className={`analytics-stat-card__icon analytics-stat-card__icon--${iconVariant}`} aria-hidden="true">{icon}</span>
      </div>
      <div className="analytics-stat-card__value">{value}</div>
      {sublabel && <div className="analytics-stat-card__sublabel">{sublabel}</div>}
    </div>
  );
}

export function AdminAnalyticsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const { showToast } = useToast();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState(null);
  const [bookingsTrend, setBookingsTrend] = useState(null);
  const [topServices, setTopServices] = useState(null);
  const [staffBookings, setStaffBookings] = useState(null);
  const [topClients, setTopClients] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    apiClient
      .get(`/admin/analytics/summary?days=${days}`)
      .then(setSummary)
      .catch((err) => showToast(err.message || 'Could not load the analytics summary.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, refreshTick]);

  useEffect(() => {
    apiClient
      .get(`/admin/trends?metric=revenue&days=${days}`)
      .then(setRevenueTrend)
      .catch((err) => showToast(err.message || 'Could not load the revenue trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, refreshTick]);

  useEffect(() => {
    apiClient
      .get(`/admin/trends?metric=bookings&days=${days}`)
      .then(setBookingsTrend)
      .catch((err) => showToast(err.message || 'Could not load the bookings trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, refreshTick]);

  useEffect(() => {
    apiClient
      .get(`/admin/analytics/top-services?days=${days}`)
      .then(setTopServices)
      .catch((err) => showToast(err.message || 'Could not load top services.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, refreshTick]);

  // Cross-staff/cross-client visibility — deliberately skipped for a staff-scoped viewer,
  // matching the API's own admin-only gate on these two (§ staff-scoped admin access).
  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get(`/admin/analytics/staff-bookings?days=${days}`)
      .then(setStaffBookings)
      .catch((err) => showToast(err.message || 'Could not load staff bookings.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, refreshTick, isStaff]);

  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get('/admin/analytics/top-clients?limit=5')
      .then(setTopClients)
      .catch((err) => showToast(err.message || 'Could not load top clients.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick, isStaff]);

  if (!summary) return <p>Loading business analytics&hellip;</p>;

  const bookingStatusItems = [
    { label: 'Completed', value: summary.completedCount, color: 'var(--color-success)' },
    { label: 'Upcoming', value: summary.upcomingCount, color: 'var(--color-accent)' },
    { label: 'Cancelled', value: summary.cancelledCount, color: 'var(--color-danger)' },
    { label: 'No-shows', value: summary.noShowsCount, color: 'var(--color-warning)' },
  ].filter((i) => i.value > 0);

  const revenueByTypeItems = [
    { label: 'Bookings', value: summary.revenueBreakdown.bookingDepositCents, color: 'var(--color-accent)' },
    { label: 'Gift cards', value: summary.revenueBreakdown.giftCardPurchaseCents, color: 'var(--color-success)' },
  ].filter((i) => i.value > 0);

  const clientColumns = [
    { key: 'name', header: 'Client', render: (c) => <Link to={`/admin/clients/${c.userId}`}>{c.firstName} {c.lastName}</Link> },
    { key: 'email', header: 'Email' },
    { key: 'bookings', header: 'Bookings', render: (c) => c.bookingsCount },
  ];

  return (
    <div className="analytics-page">
      <div className="analytics-page__header">
        <h2>📊 Business Analytics</h2>
        <div className="analytics-page__controls">
          {RANGE_OPTIONS.map((opt) => (
            <Button key={opt.days} size="sm" variant={days === opt.days ? 'primary' : 'secondary'} onClick={() => setDays(opt.days)}>
              {opt.label}
            </Button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setRefreshTick((n) => n + 1)}>↻ Refresh</Button>
        </div>
      </div>

      <div className="analytics-stat-grid">
        <AnalyticsStatCard
          icon="💰"
          iconVariant="success"
          label="Combined revenue"
          value={formatCents(summary.combinedRevenueCents)}
          sublabel={`Last ${days} days`}
        />
        <AnalyticsStatCard
          icon="📅"
          iconVariant="info"
          label="Bookings"
          value={summary.bookingsInWindow}
          sublabel={`${summary.bookingsToday} today`}
        />
        {!isStaff && (
          <AnalyticsStatCard
            icon="👥"
            iconVariant="accent"
            label="Total clients"
            value={summary.totalClients}
            sublabel={`+${summary.newClientsInWindow} new`}
          />
        )}
        {!isStaff && (
          <AnalyticsStatCard
            icon="✅"
            iconVariant="success"
            label="Completion rate"
            value={summary.completionRate === null ? '—' : `${summary.completionRate}%`}
            sublabel={`${summary.cancelledCount} cancelled`}
          />
        )}
        {!isStaff && (
          <AnalyticsStatCard
            icon="⭐"
            iconVariant="warning"
            label="Loyalty members"
            value={summary.loyaltyMemberCount ?? '—'}
            sublabel={summary.avgLoyaltyPoints !== null ? `Avg ${summary.avgLoyaltyPoints} pts` : undefined}
          />
        )}
      </div>

      <div className="analytics-card analytics-card--grid-2">
        <div>
          <h3>Daily bookings</h3>
          {bookingsTrend && <SimpleBarChart points={bookingsTrend.points} series={BOOKINGS_SERIES} />}
        </div>
        <div>
          <h3>Daily revenue</h3>
          {revenueTrend && (
            <SimpleLineChart
              points={revenueTrend.points.map((p) => ({ date: p.date, value: p.revenueCents }))}
              formatValue={(v) => `R${(v / 100).toFixed(0)}`}
            />
          )}
        </div>
      </div>

      <div className="analytics-card analytics-card--grid-2">
        <div>
          <h3>Top services{isStaff ? ' (mine)' : ''}</h3>
          {topServices && (
            <RankedBarList
              items={topServices.items.map((i) => ({ label: i.name, value: i.count }))}
              emptyLabel={`No bookings in the last ${days} days yet.`}
            />
          )}
        </div>
        {!isStaff && (
          <div>
            <h3>Staff bookings</h3>
            {staffBookings && (
              <RankedBarList
                items={staffBookings.items.map((i) => ({ label: i.name, value: i.count }))}
                emptyLabel={`No bookings in the last ${days} days yet.`}
              />
            )}
          </div>
        )}
      </div>

      {!isStaff && (revenueByTypeItems.length > 0 || bookingStatusItems.length > 0) && (
        <div className="analytics-card analytics-card--grid-2">
          {revenueByTypeItems.length > 0 && (
            <div>
              <h3>Revenue by type</h3>
              <RankedBarList items={revenueByTypeItems} formatValue={formatCents} />
            </div>
          )}
          {bookingStatusItems.length > 0 && (
            <div>
              <h3>Booking status breakdown</h3>
              <RankedBarList items={bookingStatusItems} />
            </div>
          )}
        </div>
      )}

      {!isStaff && topClients && topClients.items.length > 0 && (
        <div className="analytics-card">
          <h3>Top clients by bookings</h3>
          <Table columns={clientColumns} rows={topClients.items} getRowKey={(c) => c.userId} emptyMessage="No clients yet." />
        </div>
      )}
    </div>
  );
}
