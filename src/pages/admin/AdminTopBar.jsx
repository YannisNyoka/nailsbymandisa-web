import { useAuth } from '../../context/AuthContext.jsx';
import './AdminLayout.css';

export function AdminTopBar({ title }) {
  const { user } = useAuth();

  return (
    <div className="admin-top-bar">
      <div>
        <h1 className="admin-top-bar__title">{title}</h1>
        <p className="admin-top-bar__subtitle">NailsByMandisa · Admin Panel</p>
      </div>
      {user && (
        <div className="admin-top-bar__user">
          <p className="admin-top-bar__user-name">{user.firstName} {user.lastName}</p>
          <p className="admin-top-bar__user-email">{user.email}</p>
        </div>
      )}
    </div>
  );
}
