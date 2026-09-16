import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { apiClient, setAccessToken, setUnauthorizedHandler, ApiError } from '../lib/apiClient.js';

const AuthContext = createContext(null);

// Module-level (not per-instance) on purpose: AuthProvider is a singleton at the app
// root, but React 18 StrictMode double-invokes effects in development, and a real user
// can also trigger a fast remount (e.g. a route change during a slow load). Without this
// guard, two near-simultaneous mounts would each fire their own /auth/refresh call with
// the same stored cookie — a benign race the backend now also tolerates (see
// authService.js's grace-period handling), but avoiding it here means one rotation
// instead of two, and no reliance on that grace window at all for the common case.
let inFlightRefresh = null;

function refreshSession() {
  if (!inFlightRefresh) {
    inFlightRefresh = apiClient
      .post('/auth/refresh', undefined, { skipUnauthorizedHandler: true })
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the silent-refresh-on-load attempt resolves

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // On first load, try to resume a session from the httpOnly refresh cookie — this is
  // what lets a page reload keep the user logged in without storing the access token
  // anywhere persistent (it only ever lives in memory).
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    (async () => {
      try {
        const { user: refreshedUser, accessToken } = await refreshSession();
        setAccessToken(accessToken);
        setUser(refreshedUser);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const { user: loggedInUser, accessToken } = await apiClient.post('/auth/login', { email, password });
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (data) => {
    const { user: newUser, accessToken, welcomeDiscountCode } = await apiClient.post('/auth/register', data);
    setAccessToken(accessToken);
    setUser(newUser);
    return { user: newUser, welcomeDiscountCode };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', undefined, { skipUnauthorizedHandler: true });
    } catch {
      // Already logged out server-side (e.g. expired token) — clear local state regardless.
    }
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const { user: freshUser } = await apiClient.get('/auth/me');
    setUser(freshUser);
    return freshUser;
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAuthenticated: Boolean(user), login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { ApiError };
