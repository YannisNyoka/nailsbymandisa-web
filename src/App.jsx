import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AdminRoute } from './components/AdminRoute.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { BookingWizard } from './pages/booking/BookingWizard.jsx';
import { BookingConfirmationPage } from './pages/booking/BookingConfirmationPage.jsx';
import { BookingPaymentRetryPage } from './pages/booking/BookingPaymentRetryPage.jsx';
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { RegisterPage } from './pages/auth/RegisterPage.jsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.jsx';
import { AccountLayout } from './pages/account/AccountLayout.jsx';
import { ProfilePage } from './pages/account/ProfilePage.jsx';
import { BookingsPage } from './pages/account/BookingsPage.jsx';
import { NotificationsPage } from './pages/account/NotificationsPage.jsx';
import { LoyaltyPage } from './pages/account/LoyaltyPage.jsx';
import { ReferralsPage } from './pages/account/ReferralsPage.jsx';
import { AdminLayout } from './pages/admin/AdminLayout.jsx';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage.jsx';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage.jsx';
import { AdminClientsPage } from './pages/admin/AdminClientsPage.jsx';
import { AdminClientDetailPage } from './pages/admin/AdminClientDetailPage.jsx';
import { AdminServicesPage } from './pages/admin/AdminServicesPage.jsx';
import { AdminStaffPage } from './pages/admin/AdminStaffPage.jsx';
import { AdminAvailabilityPage } from './pages/admin/AdminAvailabilityPage.jsx';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage.jsx';
import { AdminActivityPage } from './pages/admin/AdminActivityPage.jsx';
import { AdminDiscountCodesPage } from './pages/admin/AdminDiscountCodesPage.jsx';
import { AdminGiftCardsPage } from './pages/admin/AdminGiftCardsPage.jsx';
import { GiftCardPurchasePage } from './pages/giftcards/GiftCardPurchasePage.jsx';
import { GiftCardConfirmationPage } from './pages/giftcards/GiftCardConfirmationPage.jsx';
import { GiftCardsPage } from './pages/account/GiftCardsPage.jsx';
import { SubscriptionPlansPage } from './pages/subscriptions/SubscriptionPlansPage.jsx';
import { SubscriptionPage } from './pages/account/SubscriptionPage.jsx';
import { AdminSubscriptionPlansPage } from './pages/admin/AdminSubscriptionPlansPage.jsx';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage.jsx';
import { GalleryPage } from './pages/gallery/GalleryPage.jsx';
import { SubmitPhotoPage } from './pages/gallery/SubmitPhotoPage.jsx';
import { AdminGalleryPage } from './pages/admin/AdminGalleryPage.jsx';
import { AdminGalleryModerationPage } from './pages/admin/AdminGalleryModerationPage.jsx';
import { AdminComposeNotificationPage } from './pages/admin/AdminComposeNotificationPage.jsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.jsx';
import { AdminSchedulePage } from './pages/admin/AdminSchedulePage.jsx';
import { AdminHomepagePage } from './pages/admin/AdminHomepagePage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

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
        <Route path="/subscriptions/plans" element={<SubscriptionPlansPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
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
            <Route path="/account/subscription" element={<SubscriptionPage />} />
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
            <Route path="subscription-plans" element={<AdminSubscriptionPlansPage />} />
            <Route path="subscribers" element={<AdminSubscriptionsPage />} />
            <Route path="gallery" element={<AdminGalleryPage />} />
            <Route path="gallery-moderation" element={<AdminGalleryModerationPage />} />
            <Route path="compose-notification" element={<AdminComposeNotificationPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
