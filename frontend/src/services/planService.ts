import { apiRequest } from './api';

export interface PlanAccess {
  plan: 'CERO' | 'PLUS';
  plusActive: boolean;
  capabilities: {
    payments: boolean;
    dashboard: boolean;
    snowballAndAvalanche: boolean;
    simulation: boolean;
    fullStrategyDetail: boolean;
    advancedReminders: boolean;
    detailedMonthlySummary: boolean;
  };
  limits: {
    maxDetailedDebts: number | null;
    strategyDetailLevel: 'BASIC' | 'FULL';
    monthlySummaryDetailLevel: 'BASIC' | 'DETAILED';
  };
}

export const planService = {
  getAccess: () => apiRequest<PlanAccess>('/plan')
};
