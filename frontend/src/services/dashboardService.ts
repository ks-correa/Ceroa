import { DashboardSummary } from '../types';
import { apiRequest } from './api';

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const raw = await apiRequest<DashboardSummary>('/dashboard/summary');
    return {
      ...raw,
      totalRegisteredDebt: Number(raw.totalRegisteredDebt || 0),
      activeDebtCount: Number(raw.activeDebtCount || 0),
      requiredPaymentsCurrentPeriod: raw.requiredPaymentsCurrentPeriod != null
        ? Number(raw.requiredPaymentsCurrentPeriod)
        : null,
      availableForDebt: Number(raw.availableForDebt || 0),
      totalDeclaredDebts: Number(raw.totalDeclaredDebts || 0),
      registeredDebtCount: Number(raw.registeredDebtCount || 0),
      nextDue: raw.nextDue ? {
        ...raw.nextDue,
        amount: Number(raw.nextDue.amount || 0),
        daysUntilDue: Number(raw.nextDue.daysUntilDue || 0)
      } : null,
      upcomingDues: (raw.upcomingDues || []).map((due) => ({
        ...due,
        amount: Number(due.amount || 0),
        daysUntilDue: Number(due.daysUntilDue || 0)
      })),
      progress: {
        totalOriginalDebt: raw.progress?.totalOriginalDebt != null ? Number(raw.progress.totalOriginalDebt) : null,
        totalPaidSoFar: raw.progress?.totalPaidSoFar != null ? Number(raw.progress.totalPaidSoFar) : null,
        totalRecordedPayments: Number(raw.progress?.totalRecordedPayments || 0),
        percentage: raw.progress?.percentage != null ? Number(raw.progress.percentage) : null,
        hasProgressData: Boolean(raw.progress?.hasProgressData)
      }
    };
  }
};

