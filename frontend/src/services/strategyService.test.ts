import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { strategyService } from './strategyService';

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

describe('strategyService.updateActiveStrategy', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['snowball', 'avalanche'] as const)('sends %s using the backend query enum format', async (strategy) => {
    const confirmed = { activeStrategy: strategy };
    vi.mocked(apiRequest).mockResolvedValue(confirmed);

    await expect(strategyService.updateActiveStrategy(strategy)).resolves.toEqual(confirmed);
    expect(apiRequest).toHaveBeenCalledExactlyOnceWith(
      `/strategies/active?strategy=${strategy.toUpperCase()}`,
      { method: 'PUT' }
    );
  });
});
