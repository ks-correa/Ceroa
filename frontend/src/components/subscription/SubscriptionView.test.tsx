// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SubscriptionView } from './SubscriptionView';
import { subscriptionService } from '../../services/subscriptionService';

vi.mock('../../context/AppContext', () => ({ useApp: () => ({
  planAccess: { plusActive: false }, setCurrentScreen: vi.fn(), refreshAllData: vi.fn()
}) }));
vi.mock('../../services/subscriptionService', () => ({ subscriptionService: {
  offers: vi.fn(), current: vi.fn(), capabilities: vi.fn(), ceroCapabilities: vi.fn(), checkout: vi.fn()
} }));

describe('Ceroa Plus offer', () => {
  it('updates server supplied price when periodicity changes and keeps pending separate from active', async () => {
    vi.mocked(subscriptionService.offers).mockResolvedValue([
      { periodicity: 'MONTHLY', price: 100, currency: 'COP', automaticRenewal: true, available: true },
      { periodicity: 'YEARLY', price: 900, currency: 'COP', automaticRenewal: true, available: true }
    ]);
    vi.mocked(subscriptionService.current).mockResolvedValue(null);
    vi.mocked(subscriptionService.capabilities).mockResolvedValue({
      plan: 'PLUS', plusActive: true,
      capabilities: { payments: true, dashboard: true, snowballAndAvalanche: true, simulation: true,
        fullStrategyDetail: true, advancedReminders: true, detailedMonthlySummary: true },
      limits: { maxDetailedDebts: null, strategyDetailLevel: 'FULL', monthlySummaryDetailLevel: 'DETAILED' }
    });
    vi.mocked(subscriptionService.ceroCapabilities).mockResolvedValue({
      plan: 'CERO', plusActive: false,
      capabilities: { payments: true, dashboard: true, snowballAndAvalanche: true, simulation: false,
        fullStrategyDetail: false, advancedReminders: false, detailedMonthlySummary: false },
      limits: { maxDetailedDebts: 2, strategyDetailLevel: 'BASIC', monthlySummaryDetailLevel: 'BASIC' }
    });
    render(<SubscriptionView />);
    await waitFor(() => expect(screen.getByText(/100 por mes/)).toBeTruthy());
    fireEvent.click(screen.getByLabelText('Anual'));
    expect(screen.getByText(/900 por año/)).toBeTruthy();
    expect(screen.getByText(/Renovación automática/)).toBeTruthy();
    expect(screen.getByText(/Plan vigente: Cero/)).toBeTruthy();
  });
});
