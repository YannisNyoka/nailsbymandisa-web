import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, SimpleLineChart, SimpleBarChart, useToast } from '../../design-system';
import { UnpaidAppointmentsBanner } from './UnpaidAppointmentsBanner.jsx';
import './AdminPages.css';

function formatCents(cents) {
  return `R${(cents / 100).toFixed(2)}`;
}

// 'week'/'month' are calendar-aligned (this Monday through today / the 1st of this
// month through today), matching the Revenue (week)/(month) stat cards above — not a
// rolling 7/30-day lookback. 'Year' has no calendar-aligned equivalent being asked for
// here, so it stays a rolling 365-day window.
const RANGE_OPTIONS = [
  { label: 'Week', range: 'week' },
  { label: 'Month', range: 'month' },
  { label: 'Year', range: 365 },
];

const BOOKINGS_SERIES = [
  { key: 'booked', label: 'Booked', color: 'var(--color-accent)' },
  { key: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' },
  { key: 'completed', label: 'Completed', color: 'var(--color-success)' },
];

function StatCard({ icon, label, value, variant, to }) {
  const content = (
    <>
      <span className="stat-card__icon" aria-hidden="true">{icon}</span>
      <div className="stat-card__body">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
      </div>
    </>
  );
  const className = `stat-card${variant ? ` stat-card--${variant}` : ''}${to ? ' stat-card--link' : ''}`;
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function AdminOverviewPage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [revenueRange, setRevenueRange] = useState('week');
  const [revenueTrend, setRevenueTrend] = useState(null);
  const [bookingsTrend, setBookingsTrend] = useState(null);

  function loadStats() {
    return apiClient
      .get('/admin/overview')
      .then(setStats)
      .catch((err) => showToast(err.message || 'Could not load overview.', { variant: 'error' }));
  }

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revenue is salon financial data, not staff-facing operational info — skipped
  // entirely for a staff-scoped viewer (the API itself also withholds the fields).
  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get(`/admin/trends?metric=revenue&range=${revenueRange}`)
      .then(setRevenueTrend)
      .catch((err) => showToast(err.message || 'Could not load the revenue trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revenueRange, isStaff]);

  useEffect(() => {
    apiClient
      .get('/admin/trends?metric=bookings&range=30')
      .then(setBookingsTrend)
      .catch((err) => showToast(err.message || 'Could not load the bookings trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!stats) return <p>Loading overview&hellip;</p>;

  return (
    <div>
      <div className="admin-page__header-row" style={{ justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <Link to="/admin/analytics"><Button variant="secondary">📊 View full business analytics</Button></Link>
      </div>

      <div className="stat-grid">
        <StatCard icon="📅" label="Bookings today" value={stats.appointmentsToday} variant="accent" />
        <StatCard icon="⏰" label="Upcoming" value={stats.upcomingConfirmed} variant="accent-muted" />
        {!isStaff && <StatCard icon="💰" label="Revenue today" value={formatCents(stats.revenueTodayCents)} variant="ink" />}
        {!isStaff && <StatCard icon="📈" label="Revenue (week)" value={formatCents(stats.revenueWeekCents)} variant="ink" />}
        {!isStaff && <StatCard icon="📊" label="Revenue (month)" value={formatCents(stats.revenueMonthCents)} variant="ink" />}
        <StatCard icon="✕" label="Cancellations" value={stats.cancellationsCount} variant="danger" />
        <StatCard icon="🚫" label="No-shows" value={stats.noShowsCount} variant="warning" />
        <StatCard icon="💳" label="Unpaid bookings" value={stats.unpaidBookings} to="/admin/appointments?status=pending_payment" />
      </div>

      {!isStaff && <UnpaidAppointmentsBanner onChange={loadStats} />}

      {/* Revenue — including the trend chart below — is salon financial data, not
          staff-facing operational info, so it's hidden entirely for a staff account
          (the API itself also withholds these fields for a staff-scoped request, this
          isn't the only thing standing between staff and seeing it). */}
      {!isStaff && (
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h2>Revenue trend</h2>
            <div className="admin-chart-card__range">
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.range}
                  size="sm"
                  variant={revenueRange === opt.range ? 'primary' : 'secondary'}
                  onClick={() => setRevenueRange(opt.range)}
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
      )}

      <div className="admin-chart-card">
        <div className="admin-chart-card__header">
          <h2>Bookings trend</h2>
        </div>
        {bookingsTrend && <SimpleBarChart points={bookingsTrend.points} series={BOOKINGS_SERIES} />}
      </div>

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
