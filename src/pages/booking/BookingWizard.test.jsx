import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BookingWizard } from './BookingWizard.jsx';
import { AuthProvider } from '../../context/AuthContext.jsx';
import { ToastProvider } from '../../design-system';

function jsonResponse(body, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
}

const SERVICE = { _id: 'svc1', name: 'Gel manicure', category: 'gel', durationMinutes: 60, priceCents: 30000, isActive: true };
const EMPLOYEE = { _id: 'emp1', name: 'Naledi', isActive: true, serviceIds: null, workingHours: {} };

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/book']}>
      <ToastProvider>
        <AuthProvider>
          <BookingWizard />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('BookingWizard — guest flow', () => {
  beforeEach(() => {
    delete window.location;
    window.location = { href: '' };

    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) return jsonResponse({ error: { message: 'Unauthorized' } }, 401);
      if (u.includes('/services')) return jsonResponse({ services: [SERVICE] });
      if (u.includes('/staff')) return jsonResponse({ employees: [EMPLOYEE] });
      if (u.includes('/appointments/slots')) return jsonResponse({ slots: ['10:00', '11:00'] });
      if (u.includes('/payments/appointments/') && u.includes('/checkout')) {
        return jsonResponse({ payment: { redirectUrl: 'https://c.yoco.com/checkout/abc' } });
      }
      if (u.endsWith('/appointments')) {
        return jsonResponse({ appointment: { _id: 'appt1', status: 'pending_payment' } }, 201);
      }
      return jsonResponse({}, 404);
    });
  });

  it('walks a guest through service, staff, slot, details and on to payment', async () => {
    renderWizard();
    const user = userEvent.setup();

    // Step 1: services
    await screen.findByText('Gel manicure');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: staff — "Any available" is selected by default
    await screen.findByText('Naledi');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: date & time
    const dateInput = screen.getByLabelText(/date/i);
    await user.type(dateInput, '2027-01-15');
    const slotButton = await screen.findByRole('button', { name: '10:00' });
    await user.click(slotButton);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 4: guest details
    await user.type(screen.getByLabelText(/name/i), 'Guest Person');
    await user.type(screen.getByLabelText(/email/i), 'guest@example.com');
    await user.type(screen.getByLabelText(/phone/i), '0821234567');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 5: review and confirm
    await screen.findByText(/review your booking/i);
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));

    await waitFor(() => expect(window.location.href).toBe('https://c.yoco.com/checkout/abc'));

    const bookingCall = global.fetch.mock.calls.find(([url]) => String(url).endsWith('/appointments'));
    const bookingBody = JSON.parse(bookingCall[1].body);
    expect(bookingBody.guestInfo).toEqual({ name: 'Guest Person', email: 'guest@example.com', phone: '0821234567' });
    expect(bookingBody.serviceIds).toEqual(['svc1']);
    expect(bookingBody.startTime).toBe('10:00');
  });
});
