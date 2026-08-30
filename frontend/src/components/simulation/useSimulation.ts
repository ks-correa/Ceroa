import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SIMULATION_PARAMS } from '../../constants/defaults';
import { simulationService } from '../../services/simulationService';
import { Debt, SimulationParams, SimulationResult, StrategyType } from '../../types';

export const useSimulation = (debts: Debt[], strategy: StrategyType, enabled: boolean) => {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_SIMULATION_PARAMS);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const calculate = useCallback(async (): Promise<boolean> => {
    if (!enabled || debts.length === 0) {
      setResult(null);
      return false;
    }

    const currentRequest = ++requestId.current;
    setIsCalculating(true);
    setError(null);
    try {
      const simulation = await simulationService.runSimulation(debts, params, strategy);
      if (currentRequest === requestId.current) setResult(simulation);
      return currentRequest === requestId.current;
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'No fue posible calcular la simulación.');
      }
      return false;
    } finally {
      if (currentRequest === requestId.current) setIsCalculating(false);
    }
  }, [debts, enabled, params, strategy]);

  useEffect(() => {
    void calculate();
    return () => { requestId.current += 1; };
  }, [calculate]);

  return { params, setParams, result, isCalculating, error, calculate };
};
