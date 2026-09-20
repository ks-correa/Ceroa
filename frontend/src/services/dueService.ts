import { UpcomingDueItem } from '../types';
import { apiRequest } from './api';

export const dueService = {
  async getUpcomingDues(): Promise<UpcomingDueItem[]> {
    const list = await apiRequest<UpcomingDueItem[]>('/due-dates/upcoming');
    return (list || []).map((due) => ({
      ...due,
      amount: Number(due.amount || 0),
      daysUntilDue: Number(due.daysUntilDue || 0)
    }));
  },

  async getUpcomingDueForDebt(debtId: string): Promise<UpcomingDueItem | null> {
    try {
      const due = await apiRequest<UpcomingDueItem>(`/due-dates/upcoming/${debtId}`);
      if (!due) return null;
      return {
        ...due,
        amount: Number(due.amount || 0),
        daysUntilDue: Number(due.daysUntilDue || 0)
      };
    } catch {
      return null;
    }
  }
};

