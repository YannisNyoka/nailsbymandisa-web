import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminLayout.css';

export function AdminTopBar({ title, unpaidCount = 0, count = null }) {
  const { user } = useAuth();

  return (
    <div className="admin-top-bar">
      <div>
        <h1 className="admin-top-bar__title">
          {title}
          {count !== null && <span className="admin-top-bar__count">{count}</span>}
        </h1>
        <p className="admin-top-bar__subtitle">NailsByMandisa · Admin Panel</p>
      </div>
      <div className="admin-top-bar__right">
        {unpaidCount > 0 && (
          <Link to="/admin/appointments?status=pending_payment" className="admin-top-bar__unpaid-badge">
            ⚠️ {unpaidCount} Unpaid
          </Link>
        )}
        {user && (
          <div className="admin-top-bar__user">
            <p className="admin-top-bar__user-name">{user.firstName} {user.lastName}</p>
            <p className="admin-top-bar__user-email">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}
