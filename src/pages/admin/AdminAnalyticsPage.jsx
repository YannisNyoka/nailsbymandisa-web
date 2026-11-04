import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button, SimpleLineChart, SimpleBarChart, PeriodBarChart, RankedBarList, Table, useToast } from '../../design-system';
import './AdminAnalyticsPage.css';

function formatCents(cents) {
  return `R${(cents / 100).toFixed(0)}`;
}

// 'week'/'month' are calendar-aligned (this Monday through today / the 1st of this
// month through today), matching the Overview page's Revenue (week)/(month) cards — not
// a rolling 7/30-day lookback. 90 days/1 year have no calendar-aligned equivalent being
// asked for here, so they stay rolling windows.
const RANGE_OPTIONS = [
  { label: 'This week', range: 'week' },
  { label: 'This month', range: 'month' },
  { label: '90 days', range: 90 },
  { label: '1 year', range: 365 },
];

function rangeLabel(range) {
  if (range === 'week') return 'this week';
  if (range === 'month') return 'this month';
  return `in the last ${range} days`;
}

const BOOKINGS_SERIES = [
  { key: 'booked', label: 'Booked', color: 'var(--color-accent)' },
  { key: 'cancelled', label: 'Cancelled', color: 'var(--color-danger)' },
  { key: 'completed', label: 'Completed', color: 'var(--color-success)' },
];

// Business Growth panel (period-over-period comparison + 8-period trend, api's
// adminService.getBusinessGrowth) — a different concept from RANGE_OPTIONS above (which
// drives the rest of this page): that's a single adjustable lookback window, this is
// always "this [unit] so far vs. the same elapsed stretch of the previous one," with its
// own fixed Weekly/Monthly/Yearly toggle.
const GROWTH_UNITS = [
  { unit: 'week', toggleLabel: 'Weekly', noun: 'week', periodDescription: 'This week (Mon–today)' },
  { unit: 'month', toggleLabel: 'Monthly', noun: 'month', periodDescription: 'This month (1st–today)' },
  { unit: 'year', toggleLabel: 'Yearly', noun: 'year', periodDescription: 'This year (Jan 1–today)' },
];

function formatPeriodLabel(unit, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (unit === 'week') return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  if (unit === 'month') return date.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return String(y);
}

function GrowthStatCard({ icon, label, metric, formatValue, noun }) {
  const { current, sameStretchLastPeriod, fullLastPeriod, growthPct } = metric;
  return (
    <div className="growth-stat-card">
      <div className="growth-stat-card__top">
        <span className="growth-stat-card__label">{label}</span>
        <span className="growth-stat-card__icon" aria-hidden="true">{icon}</span>
      </div>
      <div className="growth-stat-card__value">{formatValue(current)}</div>
      {growthPct === null ? (
        <p className="growth-stat-card__no-data">No last {noun} data</p>
      ) : (
        <p className={`growth-stat-card__growth growth-stat-card__growth--${growthPct >= 0 ? 'up' : 'down'}`}>
          {growthPct >= 0 ? '▲' : '▼'} {Math.abs(growthPct)}%
        </p>
      )}
      <p className="growth-stat-card__caption">
        {formatValue(sameStretchLastPeriod)} same point last {noun} &middot; {formatValue(fullLastPeriod)} full {noun}
      </p>
    </div>
  );
}

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
  const [range, setRange] = useState('month');
  const [summary, setSummary] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState(null);
  const [bookingsTrend, setBookingsTrend] = useState(null);
  const [topServices, setTopServices] = useState(null);
  const [staffBookings, setStaffBookings] = useState(null);
  const [topClients, setTopClients] = useState(null);
  const [growthUnit, setGrowthUnit] = useState('week');
  const [growth, setGrowth] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  // Admin-only, same boundary as combined revenue above — withheld server-side too
  // (requirePermission, not requirePermissionOrStaffSelf), this just avoids firing a
  // request a staff account would get a 403 from.
  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get(`/admin/analytics/growth?unit=${growthUnit}`)
      .then(setGrowth)
      .catch((err) => showToast(err.message || 'Could not load business growth.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [growthUnit, refreshTick, isStaff]);

  useEffect(() => {
    apiClient
      .get(`/admin/analytics/summary?range=${range}`)
      .then(setSummary)
      .catch((err) => showToast(err.message || 'Could not load the analytics summary.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, refreshTick]);

  // Revenue is salon financial data, not staff-facing operational info — skipped
  // entirely for a staff-scoped viewer, matching the overview page and the API's own
  // withholding of revenue fields for a staff-scoped request.
  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get(`/admin/trends?metric=revenue&range=${range}`)
      .then(setRevenueTrend)
      .catch((err) => showToast(err.message || 'Could not load the revenue trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, refreshTick, isStaff]);

  useEffect(() => {
    apiClient
      .get(`/admin/trends?metric=bookings&range=${range}`)
      .then(setBookingsTrend)
      .catch((err) => showToast(err.message || 'Could not load the bookings trend.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, refreshTick]);

  useEffect(() => {
    apiClient
      .get(`/admin/analytics/top-services?range=${range}`)
      .then(setTopServices)
      .catch((err) => showToast(err.message || 'Could not load top services.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, refreshTick]);

  // Cross-staff/cross-client visibility — deliberately skipped for a staff-scoped viewer,
  // matching the API's own admin-only gate on these two (§ staff-scoped admin access).
  useEffect(() => {
    if (isStaff) return;
    apiClient
      .get(`/admin/analytics/staff-bookings?range=${range}`)
      .then(setStaffBookings)
      .catch((err) => showToast(err.message || 'Could not load staff bookings.', { variant: 'error' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, refreshTick, isStaff]);

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

  // revenueBreakdown is null for a staff-scoped summary (withheld server-side), so this
  // stays empty for staff rather than reading off a null.
  const revenueByTypeItems = summary.revenueBreakdown
    ? [
        { label: 'Bookings', value: summary.revenueBreakdown.bookingDepositCents, color: 'var(--color-accent)' },
        { label: 'Gift cards', value: summary.revenueBreakdown.giftCardPurchaseCents, color: 'var(--color-success)' },
      ].filter((i) => i.value > 0)
    : [];

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
            <Button key={opt.range} size="sm" variant={range === opt.range ? 'primary' : 'secondary'} onClick={() => setRange(opt.range)}>
              {opt.label}
            </Button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => setRefreshTick((n) => n + 1)}>↻ Refresh</Button>
        </div>
      </div>

      <div className="analytics-stat-grid">
        {!isStaff && (
          <AnalyticsStatCard
            icon="💰"
            iconVariant="success"
            label="Combined revenue"
            value={formatCents(summary.combinedRevenueCents)}
            sublabel={rangeLabel(range).replace(/^./, (c) => c.toUpperCase())}
          />
        )}
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

      {!isStaff && growth && (
        <div className="analytics-card">
          <div className="analytics-card__header">
            <h3>📈 Business Growth</h3>
            <div className="analytics-page__controls">
              {GROWTH_UNITS.map((opt) => (
                <Button
                  key={opt.unit}
                  size="sm"
                  variant={growthUnit === opt.unit ? 'primary' : 'secondary'}
                  onClick={() => setGrowthUnit(opt.unit)}
                >
                  {opt.toggleLabel}
                </Button>
              ))}
            </div>
          </div>
          {(() => {
            const meta = GROWTH_UNITS.find((o) => o.unit === growthUnit);
            return (
              <>
                <p className="growth-panel__description">
                  {meta.periodDescription} compared with the same stretch of last {meta.noun}. Growth is shown against
                  that like-for-like period.
                </p>
                <div className="growth-stat-grid">
                  <GrowthStatCard icon="💰" label="Revenue" metric={growth.revenue} formatValue={formatCents} noun={meta.noun} />
                  <GrowthStatCard icon="📅" label="Bookings" metric={growth.bookings} formatValue={String} noun={meta.noun} />
                  <GrowthStatCard
                    icon="👥"
                    label="New Customers"
                    metric={growth.newCustomers}
                    formatValue={String}
                    noun={meta.noun}
                  />
                </div>
                <div className="growth-trend-grid">
                  <div>
                    <h4>Revenue &middot; last 8 {meta.noun}s</h4>
                    <PeriodBarChart
                      points={growth.trend.revenue}
                      formatValue={formatCents}
                      formatLabel={(p) => formatPeriodLabel(growthUnit, p.periodStart)}
                    />
                  </div>
                  <div>
                    <h4>Bookings &middot; last 8 {meta.noun}s</h4>
                    <PeriodBarChart
                      points={growth.trend.bookings}
                      formatLabel={(p) => formatPeriodLabel(growthUnit, p.periodStart)}
                    />
                  </div>
                  <div>
                    <h4>New Customers &middot; last 8 {meta.noun}s</h4>
                    <PeriodBarChart
                      points={growth.trend.newCustomers}
                      formatLabel={(p) => formatPeriodLabel(growthUnit, p.periodStart)}
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      <div className="analytics-card analytics-card--grid-2">
        <div>
          <h3>Daily bookings</h3>
          {bookingsTrend && <SimpleBarChart points={bookingsTrend.points} series={BOOKINGS_SERIES} />}
        </div>
        {!isStaff && (
          <div>
            <h3>Daily revenue</h3>
            {revenueTrend && (
              <SimpleLineChart
                points={revenueTrend.points.map((p) => ({ date: p.date, value: p.revenueCents }))}
                formatValue={(v) => `R${(v / 100).toFixed(0)}`}
              />
            )}
          </div>
        )}
      </div>

      <div className="analytics-card analytics-card--grid-2">
        <div>
          <h3>Top services{isStaff ? ' (mine)' : ''}</h3>
          {topServices && (
            <RankedBarList
              items={topServices.items.map((i) => ({ label: i.name, value: i.count }))}
              emptyLabel={`No bookings ${rangeLabel(range)} yet.`}
            />
          )}
        </div>
        {!isStaff && (
          <div>
            <h3>Staff bookings</h3>
            {staffBookings && (
              <RankedBarList
                items={staffBookings.items.map((i) => ({ label: i.name, value: i.count }))}
                emptyLabel={`No bookings ${rangeLabel(range)} yet.`}
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
