import {
  Debt,
  SimulationPeriodDetail,
  SimulationProjectionDetail,
  SimulationRequestPayload,
  SimulationResponsePayload,
  StrategyType
} from '../types';
import { apiRequest } from './api';

const normalizePeriod = (p: SimulationPeriodDetail): SimulationPeriodDetail => ({
  period: Number(p.period),
  date: String(p.date || ''),
  openingBalance: Number(p.openingBalance || 0),
  normalPayment: Number(p.normalPayment || 0),
  extraPayment: Number(p.extraPayment || 0),
  interest: Number(p.interest || 0),
  principal: Number(p.principal || 0),
  closingBalance: Number(p.closingBalance || 0)
});

const normalizeProjection = (proj: SimulationProjectionDetail | null): SimulationProjectionDetail | null => {
  if (!proj) return null;
  return {
    totalInterest: Number(proj.totalInterest || 0),
    totalPrincipal: Number(proj.totalPrincipal || 0),
    estimatedMonths: Number(proj.estimatedMonths || 0),
    estimatedPayoffDate: String(proj.estimatedPayoffDate || '')
  };
};

export const simulationService = {
  /**
   * Ordena obligaciones según la estrategia:
   * - Snowball: menor saldo primero
   * - Avalanche: mayor tasa primero
   */
  sortDebtsByStrategy(debts: Debt[], strategy: StrategyType): Debt[] {
    const activeDebts = debts.filter((d) => d.currentBalance > 0);
    if (strategy === 'snowball') {
      return [...activeDebts].sort((a, b) => a.currentBalance - b.currentBalance);
    } else {
      return [...activeDebts].sort((a, b) => b.interestRate - a.interestRate);
    }
  },

  /**
   * Ejecuta la simulación de pagos puramente en backend.
   */
  async runSimulation(payload: SimulationRequestPayload): Promise<SimulationResponsePayload> {
    const response = await apiRequest<SimulationResponsePayload>('/simulations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      ...response,
      baseline: normalizeProjection(response.baseline),
      simulated: normalizeProjection(response.simulated),
      differences: response.differences ? {
        monthsReduced: Number(response.differences.monthsReduced || 0),
        estimatedInterestSavings: Number(response.differences.estimatedInterestSavings || 0)
      } : null,
      periods: (response.periods || []).map(normalizePeriod)
    };
  }
};
