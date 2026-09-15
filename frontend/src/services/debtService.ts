import { CreateDebtPayload, Debt, PaymentMutationResponse, PaymentRecord, PaymentType } from '../types';
import { apiRequest } from './api';

const normalizeDebt = (debt: Debt): Debt => ({
  ...debt,
  entity: debt.entity || '',
  originalAmount: Number(debt.originalAmount || 0),
  currentBalance: Number(debt.currentBalance),
  interestRate: Number(debt.interestRate || 0),
  monthlyPayment: Number(debt.monthlyPayment || 0),
  minimumPayment: Number(debt.minimumPayment || 0),
  dueDateDay: Number(debt.dueDateDay || 15),
  nextDueDate: debt.nextDueDate || ''
});

const normalizePayment = (payment: PaymentRecord): PaymentRecord => ({
  ...payment,
  amount: Number(payment.amount),
  debtCurrentBalance: payment.debtCurrentBalance !== undefined ? Number(payment.debtCurrentBalance) : undefined,
  debtOriginalAmount: payment.debtOriginalAmount !== undefined ? Number(payment.debtOriginalAmount) : undefined
});

export const debtService = {
  async getDebts(): Promise<Debt[]> {
    const debts = await apiRequest<Debt[]>('/debts');
    return debts.map(normalizeDebt);
  },

  async getDebtById(id: string): Promise<Debt> {
    return normalizeDebt(await apiRequest<Debt>(`/debts/${id}`));
  },

  async createDebt(newDebtData: CreateDebtPayload): Promise<Debt> {
    return normalizeDebt(await apiRequest<Debt>('/debts', {
      method: 'POST',
      body: JSON.stringify(newDebtData)
    }));
  },

  async updateDebt(id: string, updates: Partial<CreateDebtPayload>): Promise<Debt> {
    const current = await this.getDebtById(id);
    const payload: CreateDebtPayload = {
      name: updates.name ?? current.name,
      entity: updates.entity ?? current.entity,
      type: updates.type ?? current.type,
      categoryLabel: updates.categoryLabel ?? current.categoryLabel,
      originalAmount: updates.originalAmount !== undefined ? updates.originalAmount : current.originalAmount,
      currentBalance: updates.currentBalance ?? current.currentBalance,
      interestRate: updates.interestRate ?? current.interestRate,
      rateType: updates.rateType ?? current.rateType,
      monthlyPayment: updates.monthlyPayment ?? current.monthlyPayment,
      minimumPayment: updates.minimumPayment ?? current.minimumPayment,
      dueDateDay: updates.dueDateDay ?? current.dueDateDay,
      nextDueDate: updates.nextDueDate ?? current.nextDueDate,
      disbursementDate: updates.disbursementDate ?? current.disbursementDate,
      termRemainingMonths: updates.termRemainingMonths ?? current.termRemainingMonths,
      accountNumber: updates.accountNumber ?? current.accountNumber,
      notes: updates.notes ?? current.notes,
      color: updates.color ?? current.color,
      details: updates.details ?? current.details
    };
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

  async deletePayment(id: string): Promise<PaymentMutationResponse | void> {
    return await apiRequest<PaymentMutationResponse>(`/payments/${id}`, { method: 'DELETE' });
  }
};
