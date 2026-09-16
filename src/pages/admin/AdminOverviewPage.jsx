import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, SimpleLineChart, SimpleBarChart, useToast } from '../../design-system';
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

function StatCard({ icon, label, value, variant }) {
  return (
    <div className={`stat-card${variant ? ` stat-card--${variant}` : ''}`}>
      <span className="stat-card__icon" aria-hidden="true">{icon}</span>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
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

  if (!stats) return <p>Loading overview&hellip;</p>;

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
      </div>

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

      {!isStaff && (
        <>
          <h2>Recent activity</h2>
          <ul className="activity-feed">
            {stats.recentActivity.length === 0 && <li>No activity yet.</li>}
            {stats.recentActivity.map((entry) => (
              <li key={entry._id}>
                {entry.message}
                <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
