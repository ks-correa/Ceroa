import { StrategyType } from '../types';
import { apiRequest } from './api';

export interface StrategyComparison {
  activeStrategy: StrategyType;
  snowball: { totalInterest: number; payoffDate: string; months: number; savingsVsSnowball: number };
  avalanche: { totalInterest: number; payoffDate: string; months: number; savingsVsSnowball: number };
  orderedDebtIds: string[];
}

export const strategyService = {
  async getComparison(strategy: StrategyType): Promise<StrategyComparison> {
    const result = await apiRequest<StrategyComparison>(`/strategies/comparison?strategy=${strategy}`);
    return {
      ...result,
      snowball: { ...result.snowball, totalInterest: Number(result.snowball.totalInterest), savingsVsSnowball: Number(result.snowball.savingsVsSnowball) },
      avalanche: { ...result.avalanche, totalInterest: Number(result.avalanche.totalInterest), savingsVsSnowball: Number(result.avalanche.savingsVsSnowball) }
    };
  }
};
