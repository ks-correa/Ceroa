import { useEffect, useState } from 'react';
import { strategyService, StrategyComparison } from '../../services/strategyService';
import { StrategyType } from '../../types';

const EMPTY_COMPARISON: StrategyComparison = {
  activeStrategy: 'snowball',
  snowball: { totalInterest: 0, payoffDate: 'Calculando...', months: 0, savingsVsSnowball: 0 },
  avalanche: { totalInterest: 0, payoffDate: 'Calculando...', months: 0, savingsVsSnowball: 0 },
  orderedDebtIds: []
};

export const useStrategyComparison = (
  strategy: StrategyType,
  hasDebts: boolean
) => {
  const [comparison, setComparison] = useState<StrategyComparison>(EMPTY_COMPARISON);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!hasDebts) {
      setComparison(EMPTY_COMPARISON);
      return () => { cancelled = true; };
    }

    setIsLoading(true);
    setError(null);
    void strategyService.getComparison(strategy)
      .then((nextComparison) => {
        if (!cancelled) setComparison(nextComparison);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No fue posible cargar la estrategia.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [hasDebts, strategy]);

  return { comparison, isLoading, error };
};
