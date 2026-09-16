import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiClient } from '../../lib/apiClient.js';
import { Button, FormField, useToast } from '../../design-system';
import './AccountPages.css';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiClient.patch('/auth/me', { ...profile, phone: profile.phone || null });
      await refreshUser();
      showToast('Profile updated.', { variant: 'success' });
    } catch (err) {
      showToast(err.message || 'Could not update profile.', { variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError(null);
    setChangingPassword(true);
    try {
      await apiClient.post('/auth/change-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      showToast('Password changed. Please log in again on your other devices.', { variant: 'success' });
    } catch (err) {
      setPasswordError(err.message || 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="account-page">
      <h1>Your profile</h1>

      <section className="account-page__section">
        <h2>Details</h2>
        <form onSubmit={handleProfileSubmit} noValidate>
          <FormField label="First name" required>
            <input
              value={profile.firstName}
              onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
            />
          </FormField>
          <FormField label="Last name" required>
            <input
              value={profile.lastName}
              onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
            />
          </FormField>
          <FormField label="Phone">
            <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
          </FormField>
          <FormField label="Email">
            <input value={user.email} disabled />
          </FormField>
          <Button type="submit" loading={savingProfile}>
            Save changes
          </Button>
        </form>
      </section>

      <section className="account-page__section">
        <h2>Change password</h2>
        <form onSubmit={handlePasswordSubmit} noValidate>
          {passwordError && (
            <p className="account-page__error" role="alert">
              {passwordError}
            </p>
          )}
          <FormField label="Current password" required>
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </FormField>
          <FormField label="New password" required hint="At least 10 characters">
            <input
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </FormField>
          <Button type="submit" variant="secondary" loading={changingPassword}>
            Change password
          </Button>
        </form>
      </section>
    </div>
  );
}
