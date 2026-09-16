import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LoginPage } from './LoginPage.jsx';
import { AuthProvider } from '../../context/AuthContext.jsx';
import { ToastProvider } from '../../design-system';

function jsonResponse(body, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
}

function DestinationPage() {
  return <p>Signed in destination</p>;
}

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account/bookings" element={<DestinationPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      // AuthProvider's mount-time silent refresh — no session yet.
      if (String(url).includes('/auth/refresh')) return jsonResponse({ error: { message: 'Unauthorized' } }, 401);
      if (String(url).includes('/auth/login')) {
        return jsonResponse({
          user: { _id: 'u1', firstName: 'Naledi', email: 'naledi@example.com' },
          accessToken: 'fake-token',
        });
      }
      return jsonResponse({}, 404);
    });
  });

  it('logs in and navigates to the account bookings page', async () => {
    renderLoginPage();

    await userEvent.type(screen.getByLabelText(/email/i), 'naledi@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'supersecret123');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(screen.getByText('Signed in destination')).toBeInTheDocument());

    const loginCall = global.fetch.mock.calls.find(([url]) => String(url).includes('/auth/login'));
    expect(loginCall).toBeTruthy();
    const [, options] = loginCall;
    expect(JSON.parse(options.body)).toEqual({ email: 'naledi@example.com', password: 'supersecret123' });
  });

  it('shows the server error message on failed login without navigating', async () => {
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/auth/refresh')) return jsonResponse({ error: { message: 'Unauthorized' } }, 401);
      if (String(url).includes('/auth/login')) {
        return jsonResponse({ error: { message: 'Invalid email or password.' } }, 401);
      }
      return jsonResponse({}, 404);
    });

    renderLoginPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'naledi@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.queryByText('Signed in destination')).not.toBeInTheDocument();
  });
});
