import { Debt } from '../types';

export interface DebtSummary {
  totalDebt: number;
  totalOriginalDebt: number;
  totalPaidSoFar: number;
  overallProgressPercentage: number;
  nextTotalMonthlyPayment: number;
  activeAccountsCount: number;
}

export const getMonthlyCommitment = (debt: Debt): number =>
  debt.monthlyPayment || debt.minimumPayment || 0;

export const calculateDebtSummary = (debts: Debt[]): DebtSummary => {
  const totalDebt = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
  const totalOriginalDebt = debts.reduce((sum, debt) => sum + debt.originalAmount, 0);
  const totalPaidSoFar = Math.max(0, totalOriginalDebt - totalDebt);

  return {
    totalDebt,
    totalOriginalDebt,
    totalPaidSoFar,
    overallProgressPercentage: totalOriginalDebt > 0
      ? Math.min(100, Math.round((totalPaidSoFar / totalOriginalDebt) * 100))
      : 0,
    nextTotalMonthlyPayment: debts.reduce(
      (sum, debt) => sum + getMonthlyCommitment(debt),
      0
    ),
    activeAccountsCount: debts.filter((debt) => debt.currentBalance > 0).length
  };
};
