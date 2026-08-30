import { Debt, PaymentRecord } from '../types';

export interface DebtSummary {
  totalDebt: number;
  totalOriginalDebt: number;
  totalPaidSoFar: number;
  totalRecordedPayments: number;
  overallProgressPercentage: number;
  nextTotalMonthlyPayment: number;
  activeAccountsCount: number;
}

export const getMonthlyCommitment = (debt: Debt): number =>
  debt.monthlyPayment || debt.minimumPayment || 0;

export const calculateDebtSummary = (debts: Debt[], payments: PaymentRecord[] = []): DebtSummary => {
  const totalDebt = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
  const totalOriginalDebt = debts.reduce((sum, debt) => sum + debt.originalAmount, 0);
  const totalPaidSoFar = debts.reduce(
    (sum, debt) => sum + Math.max(0, debt.originalAmount - debt.currentBalance),
    0
  );
  const totalRecordedPayments = payments
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const activeDebts = debts.filter((debt) => debt.currentBalance > 0);

  return {
    totalDebt,
    totalOriginalDebt,
    totalPaidSoFar,
    totalRecordedPayments,
    overallProgressPercentage: totalOriginalDebt > 0
      ? Math.min(100, Math.round((totalPaidSoFar / totalOriginalDebt) * 100))
      : 0,
    nextTotalMonthlyPayment: activeDebts.reduce(
      (sum, debt) => sum + getMonthlyCommitment(debt),
      0
    ),
    activeAccountsCount: activeDebts.length
  };
};
