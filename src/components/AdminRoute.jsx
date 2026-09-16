import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// §5.3/§5.4 — this is a UX convenience only (hide the nav, redirect away). It is NOT the
// security boundary: every admin API route independently re-checks role/permission from
// the database on each request (middleware/auth.js), since a client-side check can always
// be bypassed.
export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/login" replace />;
  return <Outlet />;
}
