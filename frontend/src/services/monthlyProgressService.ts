import { apiRequest } from './api';

export interface MonthlyProgress {
  year: number;
  month: number;
  status: 'EMPTY' | 'INSUFFICIENT_DATA' | 'SUCCESS';
  detailLevel: 'BASIC' | 'FULL';
  openingDebt: number | null;
  closingDebt: number | null;
  totalPaid: number | null;
  principalReduced: number | null;
  recordedInterest: number | null;
  projectedInterest: number | null;
  strategyProgress: number | null;
  registeredPaymentsCount: number | null;
  closedDebtsCount: number | null;
  comparison: {
    year: number; month: number; status: string;
    closingDebtChange: number | null; totalPaidChange: number | null;
    principalReducedChange: number | null; paymentsCountChange: number | null;
    closedDebtsCountChange: number | null;
  };
}

export const monthlyProgressService = {
  get(year: number, month: number): Promise<MonthlyProgress> {
    return apiRequest(`/monthly-progress?year=${year}&month=${month}`);
  }
};
