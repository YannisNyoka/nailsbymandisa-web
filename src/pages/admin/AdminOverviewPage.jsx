import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, SimpleLineChart, SimpleBarChart, RankedBarList, Table, useToast } from '../../design-system';
import './AdminPages.css';

function formatCents(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

const RANGE_OPTIONS = [
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
  { label: 'Year', days: 365 },
];

const BOOKINGS_SERIES = [
  { key: 'booked', label: 'Booked', color: 'var(--color-accent)' },
  { key: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' },
  { key: 'completed', label: 'Completed', color: 'var(--color-success)' },
];

function StatCard({ icon, label, value, sublabel, variant }) {
  return (
    <div className={`stat-card${variant ? ` stat-card--${variant}` : ''}`}>
      <span className="stat-card__icon" aria-hidden="true">{icon}</span>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        {sublabel && <div className="stat-card__sublabel">{sublabel}</div>}
      </div>
    </div>
  );
}

export function AdminOverviewPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [revenueDays, setRevenueDays] = useState(7);
  const [revenueTrend, setRevenueTrend] = useState(null);
  const [bookingsTrend, setBookingsTrend] = useState(null);
  const [topServices, setTopServices] = useState(null);
  const [staffBookings, setStaffBookings] = useState(null);
  const [topClients, setTopClients] = useState(null);

  useEffect(() => {
    apiClient
      .get('/admin/overview')
      .then(setStats)
      .catch((err) => showToast(err.message || 'Could not load overview.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiClient
      .get(`/admin/trends?metric=revenue&days=${revenueDays}`)
      .then(setRevenueTrend)
      .catch((err) => showToast(err.message || 'Could not load the revenue trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenueDays]);

  useEffect(() => {
    apiClient
      .get('/admin/trends?metric=bookings&days=30')
      .then(setBookingsTrend)
      .catch((err) => showToast(err.message || 'Could not load the bookings trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiClient
      .get('/admin/analytics/top-services?days=30')
      .then(setTopServices)
      .catch((err) => showToast(err.message || 'Could not load top services.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-staff comparisons — deliberately skipped for a staff-scoped viewer, matching
  // the API's own admin-only gate on these two (§ staff-scoped admin access).
  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get('/admin/analytics/staff-bookings?days=30')
      .then(setStaffBookings)
      .catch((err) => showToast(err.message || 'Could not load staff bookings.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get('/admin/analytics/top-clients?limit=5')
      .then(setTopClients)
      .catch((err) => showToast(err.message || 'Could not load top clients.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  if (!stats) return <p>Loading overview&hellip;</p>;

  const bookingStatusItems = [
    { label: 'Completed', value: stats.completedCount, color: 'var(--color-success)' },
    { label: 'Upcoming', value: stats.upcomingConfirmed + stats.pendingPayment, color: 'var(--color-accent)' },
    { label: 'Cancelled', value: stats.cancellationsCount, color: 'var(--color-danger)' },
    { label: 'No-shows', value: stats.noShowsCount, color: 'var(--color-warning)' },
  ].filter((i) => i.value > 0);

  const revenueByTypeItems = [
    { label: 'Bookings', value: stats.revenueBreakdown.bookingDepositCents, color: 'var(--color-accent)' },
    { label: 'Gift cards', value: stats.revenueBreakdown.giftCardPurchaseCents, color: 'var(--color-success)' },
  ].filter((i) => i.value > 0);

  const clientColumns = [
    { key: 'name', header: 'Client', render: (c) => <Link to={`/admin/clients/${c.userId}`}>{c.firstName} {c.lastName}</Link> },
    { key: 'email', header: 'Email' },
    { key: 'bookings', header: 'Bookings', render: (c) => c.bookingsCount },
  ];

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon="📅" label="Bookings today" value={stats.appointmentsToday} variant="accent" />
        <StatCard icon="⏰" label="Upcoming" value={stats.upcomingConfirmed} variant="accent-muted" />
        <StatCard icon="💰" label="Revenue today" value={formatCents(stats.revenueTodayCents)} variant="ink" />
        <StatCard icon="📈" label="Revenue (week)" value={formatCents(stats.revenueWeekCents)} variant="ink" />
        <StatCard icon="📊" label="Revenue (month)" value={formatCents(stats.revenueMonthCents)} variant="ink" />
        <StatCard icon="✕" label="Cancellations" value={stats.cancellationsCount} variant="danger" />
        <StatCard icon="🚫" label="No-shows" value={stats.noShowsCount} variant="warning" />
        <StatCard icon="💳" label="Unpaid bookings" value={stats.unpaidBookings} />
        <StatCard icon="🧾" label="Avg booking value" value={formatCents(stats.avgBookingValueCents)} />
        {!isStaff && (
          <StatCard
            icon="✅"
            label="Completion rate"
            value={stats.completionRate === null ? '—' : `${stats.completionRate}%`}
            sublabel={`${stats.cancellationsCount} cancelled`}
            variant="accent-muted"
          />
        )}
        {!isStaff && <StatCard icon="👥" label="Total clients" value={stats.clientCount} />}
        {!isStaff && (
          <StatCard
            icon="⭐"
            label="Loyalty members"
            value={stats.loyaltyMemberCount ?? '—'}
            sublabel={stats.avgLoyaltyPoints !== null ? `Avg ${stats.avgLoyaltyPoints} pts` : undefined}
            variant="warning"
          />
        )}
      </div>

      {!isStaff && (revenueByTypeItems.length > 0 || bookingStatusItems.length > 0) && (
        <div className="admin-chart-card admin-chart-card__grid-2">
          {revenueByTypeItems.length > 0 && (
            <div>
              <h2>Revenue by type</h2>
              <RankedBarList items={revenueByTypeItems} formatValue={formatCents} />
            </div>
          )}
          {bookingStatusItems.length > 0 && (
            <div>
              <h2>Booking status breakdown</h2>
              <RankedBarList items={bookingStatusItems} />
            </div>
          )}
        </div>
      )}

      <div className="admin-chart-card">
        <div className="admin-chart-card__header">
          <h2>Revenue trend</h2>
          <div className="admin-chart-card__range">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.days}
                size="sm"
                variant={revenueDays === opt.days ? 'primary' : 'secondary'}
                onClick={() => setRevenueDays(opt.days)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        {revenueTrend && (
          <SimpleLineChart
            points={revenueTrend.points.map((p) => ({ date: p.date, value: p.revenueCents }))}
            formatValue={(v) => `R${(v / 100).toFixed(0)}`}
          />
        )}
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-card__header">
          <h2>Bookings trend</h2>
        </div>
        {bookingsTrend && <SimpleBarChart points={bookingsTrend.points} series={BOOKINGS_SERIES} />}
      </div>

      <div className="admin-chart-card admin-chart-card__grid-2">
        <div>
          <h2>Top services{isStaff ? ' (mine)' : ''} — last 30 days</h2>
          {topServices && (
            <RankedBarList
              items={topServices.items.map((i) => ({ label: i.name, value: i.count }))}
              emptyLabel="No bookings in the last 30 days yet."
            />
          )}
        </div>
        {!isStaff && (
          <div>
            <h2>Staff bookings — last 30 days</h2>
            {staffBookings && (
              <RankedBarList
                items={staffBookings.items.map((i) => ({ label: i.name, value: i.count }))}
                emptyLabel="No bookings in the last 30 days yet."
              />
            )}
          </div>
        )}
      </div>

      {!isStaff && topClients && topClients.items.length > 0 && (
        <div className="admin-chart-card">
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Top clients by bookings</h2>
          <Table columns={clientColumns} rows={topClients.items} getRowKey={(c) => c.userId} emptyMessage="No clients yet." />
        </div>
      )}

      {!isStaff && (
        <div className="admin-chart-card">
          <h2 style={{ marginBottom: 'var(--space-4)' }}>Quick actions</h2>
          <div className="admin-quick-actions">
            <Link to="/book"><Button>+ New booking</Button></Link>
            <Link to="/admin/services"><Button variant="secondary">+ Add service</Button></Link>
            <Link to="/admin/availability"><Button variant="secondary">⛔ Block time</Button></Link>
          </div>
        </div>
      )}
    </div>
  );
}
