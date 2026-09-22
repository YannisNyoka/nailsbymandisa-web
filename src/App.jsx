import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AdminRoute } from './components/AdminRoute.jsx';
import { AccountLayout } from './pages/account/AccountLayout.jsx';
import { AdminLayout } from './pages/admin/AdminLayout.jsx';

// Every page below used to be a static import, so a first-time visitor loading the home
// page downloaded the entire app in one bundle — all 17 admin pages, the PDF-export
// libraries (jsPDF + autotable, only ever used by AdminAppointmentsPage), everything.
// React.lazy splits each page into its own chunk, fetched only when its route is
// actually visited — Layout.jsx/AccountLayout.jsx/AdminLayout.jsx wrap their <Outlet />
// in <Suspense> so this shows a brief loading state in just the content area, not a
// full-page flash. These loaders use named exports (not default), so each needs the
// `.then(m => ({ default: m.X }))` adapter — `React.lazy` only accepts a promise that
// resolves to a `default` export.
function lazyNamed(loader, name) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const HomePage = lazyNamed(() => import('./pages/HomePage.jsx'), 'HomePage');
const BookingWizard = lazyNamed(() => import('./pages/booking/BookingWizard.jsx'), 'BookingWizard');
const BookingConfirmationPage = lazyNamed(() => import('./pages/booking/BookingConfirmationPage.jsx'), 'BookingConfirmationPage');
const BookingPaymentRetryPage = lazyNamed(() => import('./pages/booking/BookingPaymentRetryPage.jsx'), 'BookingPaymentRetryPage');
const LoginPage = lazyNamed(() => import('./pages/auth/LoginPage.jsx'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('./pages/auth/RegisterPage.jsx'), 'RegisterPage');
const ForgotPasswordPage = lazyNamed(() => import('./pages/auth/ForgotPasswordPage.jsx'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('./pages/auth/ResetPasswordPage.jsx'), 'ResetPasswordPage');
const ProfilePage = lazyNamed(() => import('./pages/account/ProfilePage.jsx'), 'ProfilePage');
const BookingsPage = lazyNamed(() => import('./pages/account/BookingsPage.jsx'), 'BookingsPage');
const NotificationsPage = lazyNamed(() => import('./pages/account/NotificationsPage.jsx'), 'NotificationsPage');
const LoyaltyPage = lazyNamed(() => import('./pages/account/LoyaltyPage.jsx'), 'LoyaltyPage');
const ReferralsPage = lazyNamed(() => import('./pages/account/ReferralsPage.jsx'), 'ReferralsPage');
const AdminOverviewPage = lazyNamed(() => import('./pages/admin/AdminOverviewPage.jsx'), 'AdminOverviewPage');
const AdminAppointmentsPage = lazyNamed(() => import('./pages/admin/AdminAppointmentsPage.jsx'), 'AdminAppointmentsPage');
const AdminClientsPage = lazyNamed(() => import('./pages/admin/AdminClientsPage.jsx'), 'AdminClientsPage');
const AdminClientDetailPage = lazyNamed(() => import('./pages/admin/AdminClientDetailPage.jsx'), 'AdminClientDetailPage');
const AdminServicesPage = lazyNamed(() => import('./pages/admin/AdminServicesPage.jsx'), 'AdminServicesPage');
const AdminStaffPage = lazyNamed(() => import('./pages/admin/AdminStaffPage.jsx'), 'AdminStaffPage');
const AdminAvailabilityPage = lazyNamed(() => import('./pages/admin/AdminAvailabilityPage.jsx'), 'AdminAvailabilityPage');
const AdminPaymentsPage = lazyNamed(() => import('./pages/admin/AdminPaymentsPage.jsx'), 'AdminPaymentsPage');
const AdminActivityPage = lazyNamed(() => import('./pages/admin/AdminActivityPage.jsx'), 'AdminActivityPage');
const AdminDiscountCodesPage = lazyNamed(() => import('./pages/admin/AdminDiscountCodesPage.jsx'), 'AdminDiscountCodesPage');
const AdminGiftCardsPage = lazyNamed(() => import('./pages/admin/AdminGiftCardsPage.jsx'), 'AdminGiftCardsPage');
const GiftCardPurchasePage = lazyNamed(() => import('./pages/giftcards/GiftCardPurchasePage.jsx'), 'GiftCardPurchasePage');
const GiftCardConfirmationPage = lazyNamed(() => import('./pages/giftcards/GiftCardConfirmationPage.jsx'), 'GiftCardConfirmationPage');
const GiftCardsPage = lazyNamed(() => import('./pages/account/GiftCardsPage.jsx'), 'GiftCardsPage');
const GalleryPage = lazyNamed(() => import('./pages/gallery/GalleryPage.jsx'), 'GalleryPage');
const SubmitPhotoPage = lazyNamed(() => import('./pages/gallery/SubmitPhotoPage.jsx'), 'SubmitPhotoPage');
const AdminGalleryPage = lazyNamed(() => import('./pages/admin/AdminGalleryPage.jsx'), 'AdminGalleryPage');
const AdminGalleryModerationPage = lazyNamed(() => import('./pages/admin/AdminGalleryModerationPage.jsx'), 'AdminGalleryModerationPage');
const AdminComposeNotificationPage = lazyNamed(() => import('./pages/admin/AdminComposeNotificationPage.jsx'), 'AdminComposeNotificationPage');
const AdminUsersPage = lazyNamed(() => import('./pages/admin/AdminUsersPage.jsx'), 'AdminUsersPage');
const AdminAnalyticsPage = lazyNamed(() => import('./pages/admin/AdminAnalyticsPage.jsx'), 'AdminAnalyticsPage');
const AdminSchedulePage = lazyNamed(() => import('./pages/admin/AdminSchedulePage.jsx'), 'AdminSchedulePage');
const AdminHomepagePage = lazyNamed(() => import('./pages/admin/AdminHomepagePage.jsx'), 'AdminHomepagePage');
const AdminEnquiriesPage = lazyNamed(() => import('./pages/admin/AdminEnquiriesPage.jsx'), 'AdminEnquiriesPage');
const ContactPage = lazyNamed(() => import('./pages/ContactPage.jsx'), 'ContactPage');
const NotFoundPage = lazyNamed(() => import('./pages/NotFoundPage.jsx'), 'NotFoundPage');

// More routes land here as each build-order step reaches the frontend: PWA install,
// SEO.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/book" element={<BookingWizard />} />
        <Route path="/booking/confirmation" element={<BookingConfirmationPage />} />
        <Route path="/booking/payment" element={<BookingPaymentRetryPage />} />
        <Route path="/gift-cards/purchase" element={<GiftCardPurchasePage />} />
        <Route path="/gift-cards/confirmation" element={<GiftCardConfirmationPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AccountLayout />}>
            <Route path="/account/profile" element={<ProfilePage />} />
            <Route path="/account/bookings" element={<BookingsPage />} />
            <Route path="/account/notifications" element={<NotificationsPage />} />
            <Route path="/account/loyalty" element={<LoyaltyPage />} />
            <Route path="/account/referrals" element={<ReferralsPage />} />
            <Route path="/account/gift-cards" element={<GiftCardsPage />} />
          </Route>
          <Route path="/gallery/submit" element={<SubmitPhotoPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="appointments" element={<AdminAppointmentsPage />} />
            <Route path="schedule" element={<AdminSchedulePage />} />
            <Route path="homepage" element={<AdminHomepagePage />} />
            <Route path="clients" element={<AdminClientsPage />} />
            <Route path="clients/:id" element={<AdminClientDetailPage />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="staff" element={<AdminStaffPage />} />
            <Route path="availability" element={<AdminAvailabilityPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="activity" element={<AdminActivityPage />} />
            <Route path="discount-codes" element={<AdminDiscountCodesPage />} />
            <Route path="gift-cards" element={<AdminGiftCardsPage />} />
            <Route path="gallery" element={<AdminGalleryPage />} />
            <Route path="gallery-moderation" element={<AdminGalleryModerationPage />} />
            <Route path="compose-notification" element={<AdminComposeNotificationPage />} />
            <Route path="enquiries" element={<AdminEnquiriesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
