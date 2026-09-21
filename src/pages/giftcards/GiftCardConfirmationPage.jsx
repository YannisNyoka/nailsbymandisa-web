import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDocumentMeta } from '../../lib/useDocumentMeta.js';
import '../booking/BookingConfirmationPage.css';

export function GiftCardConfirmationPage() {
  useDocumentMeta('Gift card order received', null, { noindex: true });
  const { isAuthenticated } = useAuth();

  return (
    <div className="booking-confirmation">
      <h1>Thank you!</h1>
      <p>We&rsquo;re processing your payment. Your gift card code will be emailed as soon as it clears.</p>
      {isAuthenticated ? (
        <Link to="/account/gift-cards">My gift cards</Link>
      ) : (
        <Link to="/">Back to home</Link>
      )}
    </div>
  );
}
