import { Debt, PaymentRecord, PaymentType } from '../types';
import { apiRequest } from './api';

type DebtPayload = Omit<Debt, 'id' | 'paymentCount' | 'isPriority'>;

const normalizeDebt = (debt: Debt): Debt => ({
  ...debt,
  originalAmount: Number(debt.originalAmount),
  currentBalance: Number(debt.currentBalance),
  interestRate: Number(debt.interestRate || 0),
  monthlyPayment: Number(debt.monthlyPayment || 0),
  minimumPayment: Number(debt.minimumPayment || 0)
});

const normalizePayment = (payment: PaymentRecord): PaymentRecord => ({
  ...payment,
  amount: Number(payment.amount)
});

export const debtService = {
  async getDebts(): Promise<Debt[]> {
    const debts = await apiRequest<Debt[]>('/debts');
    return debts.map(normalizeDebt);
  },

  async getDebtById(id: string): Promise<Debt> {
    return normalizeDebt(await apiRequest<Debt>(`/debts/${id}`));
  },

  async createDebt(newDebtData: Omit<Debt, 'id'>): Promise<Debt> {
    return normalizeDebt(await apiRequest<Debt>('/debts', {
      method: 'POST',
      body: JSON.stringify(newDebtData satisfies DebtPayload)
    }));
  },

  async updateDebt(id: string, updates: Partial<Debt>): Promise<Debt> {
    const current = await this.getDebtById(id);
    const payload: DebtPayload = { ...current, ...updates };
    return normalizeDebt(await apiRequest<Debt>(`/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }));
  },

  async deleteDebt(id: string): Promise<void> {
    await apiRequest<void>(`/debts/${id}`, { method: 'DELETE' });
  },

  async getPayments(debtId?: string): Promise<PaymentRecord[]> {
    const query = debtId ? `?debtId=${encodeURIComponent(debtId)}` : '';
    const payments = await apiRequest<PaymentRecord[]>(`/payments${query}`);
    return payments.map(normalizePayment);
  },

  async recordPayment(paymentData: {
    debtId: string;
    amount: number;
    type: PaymentType;
    notes?: string;
    date: string;
  }): Promise<PaymentRecord> {
    return normalizePayment(await apiRequest<PaymentRecord>('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    }));
  },

  async updatePayment(id: string, paymentData: {
    debtId: string;
    amount: number;
    type: PaymentType;
    notes?: string;
    date: string;
  }): Promise<PaymentRecord> {
    return normalizePayment(await apiRequest<PaymentRecord>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData)
    }));
  },

  async deletePayment(id: string): Promise<void> {
    await apiRequest<void>(`/payments/${id}`, { method: 'DELETE' });
  }
};
