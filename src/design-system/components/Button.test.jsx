import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button.jsx';

describe('Button', () => {
  it('renders children and responds to click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Book now</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Book now' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables itself and shows a busy state while loading', () => {
    render(<Button loading>Book now</Button>);
    const button = screen.getByRole('button', { name: 'Book now' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
