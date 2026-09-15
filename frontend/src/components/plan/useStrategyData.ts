import { useCallback, useEffect, useState } from 'react';
import { StrategyResponse, StrategyType } from '../../types';
import { strategyService } from '../../services/strategyService';
import { useApp } from '../../context/AppContext';

export const useStrategyData = () => {
  const { debts, activeStrategy, setActiveStrategy, refreshDashboard } = useApp();
  const [data, setData] = useState<StrategyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para cambio no-optimista (CA-05 & CA-06)
  const [isChanging, setIsChanging] = useState(false);
  const [pendingStrategy, setPendingStrategy] = useState<StrategyType | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);

  const fetchStrategy = useCallback(async () => {
    if (debts.length === 0) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await strategyService.getActiveStrategy();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar la estrategia activa.');
    } finally {
      setIsLoading(false);
    }
  }, [debts]);

  useEffect(() => {
    void fetchStrategy();
  }, [fetchStrategy]);

  const changeStrategy = async (newStrategy: StrategyType): Promise<boolean> => {
    if (newStrategy === activeStrategy || isChanging) {
      return false;
    }

    setChangeError(null);
    setPendingStrategy(newStrategy);
    setIsChanging(true);

    try {
      // 1. Enviar cambio al backend
      const confirmedResult = await strategyService.updateActiveStrategy(newStrategy);

      // 2. Solo tras éxito confirmado, actualizar estado definitivo
      setData(confirmedResult);
      await setActiveStrategy(newStrategy);
      await refreshDashboard();
      setPendingStrategy(null);
      setIsChanging(false);
      return true;
    } catch (err) {
      // 3. Si falla, conservar la estrategia anterior sin aplicar el cambio
      setPendingStrategy(null);
      setIsChanging(false);
      const msg = err instanceof Error ? err.message : 'No fue posible actualizar la estrategia de pago.';
      setChangeError(msg);
      return false;
    }
  };

  return {
    data,
    isLoading,
    error,
    isChanging,
    pendingStrategy,
    changeError,
    changeStrategy,
    refetch: fetchStrategy
  };
};

