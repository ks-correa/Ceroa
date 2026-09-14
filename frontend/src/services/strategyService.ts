import { StrategyComparisonDetail, StrategyResponse, StrategyType } from '../types';
import { apiRequest } from './api';

export interface StrategyComparison {
  activeStrategy: StrategyType;
  snowball: { totalInterest: number; payoffDate: string; months: number; savingsVsSnowball: number };
  avalanche: { totalInterest: number; payoffDate: string; months: number; savingsVsSnowball: number };
  orderedDebtIds: string[];
}

export const strategyService = {
  async getActiveStrategy(): Promise<StrategyResponse> {
    return apiRequest<StrategyResponse>('/strategies/active');
  },

  async updateActiveStrategy(strategy: StrategyType): Promise<StrategyResponse> {
    return apiRequest<StrategyResponse>(`/strategies/active?strategy=${strategy}`, {
      method: 'PUT'
    });
  },

  async getComparison(): Promise<StrategyComparisonDetail> {
    return apiRequest<StrategyComparisonDetail>('/strategies/comparison');
  }
};
