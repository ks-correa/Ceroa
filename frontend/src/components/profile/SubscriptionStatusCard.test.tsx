// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SubscriptionStatusCard } from './SubscriptionStatusCard';
import { subscriptionService } from '../../services/subscriptionService';
import type { Subscription } from '../../services/subscriptionService';

vi.mock('../../context/AppContext', () => ({ useApp: () => ({ planAccess: { plusActive: true }, refreshAllData: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('../../services/subscriptionService', () => ({ subscriptionService: { current: vi.fn(), cancelRenewal: vi.fn() } }));

const active: Subscription = {
  status: 'ACTIVE', periodicity: 'MONTHLY', price: 19900, currency: 'COP', automaticRenewal: true,
  startedAt: '2026-09-01T00:00:00Z', nextPaymentAt: '2026-10-01T00:00:00Z', accessUntil: null,
  plusActive: true, canCancelRenewal: true, checkoutUrl: null
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(subscriptionService.current).mockResolvedValue(active);
});

it('shows the server date and closing confirmation does not cancel', async () => {
  render(<SubscriptionStatusCard />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar renovación' }));
  expect(screen.getByRole('dialog').textContent).toContain('30 de septiembre de 2026');
  fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(subscriptionService.cancelRenewal).not.toHaveBeenCalled();
});

it('shows confirmed cancellation only after the backend returns it', async () => {
  vi.mocked(subscriptionService.cancelRenewal).mockResolvedValue({ ...active, status: 'CANCEL_SCHEDULED', automaticRenewal: false, accessUntil: active.nextPaymentAt, canCancelRenewal: false });
  render(<SubscriptionStatusCard />);
  fireEvent.click(await screen.findByRole('button', { name: 'Cancelar renovación' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }));
  await waitFor(() => expect(screen.getByText('Cancelación programada')).toBeTruthy());
  expect(screen.getByText(/No se realizarán nuevas renovaciones/)).toBeTruthy();
});
