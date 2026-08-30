import { Debt, StrategyType } from '../types';
import { getMonthlyCommitment } from './financial';
import { simulationService } from '../services/simulationService';

export interface StrategyAllocation {
  debtId: string;
  priority: number;
  basePayment: number;
  extraPayment: number;
  recommendedPayment: number;
}

export const calculateStrategyAllocation = (
  debts: Debt[],
  strategy: StrategyType,
  monthlyBudget: number
): StrategyAllocation[] => {
  const ordered = simulationService.sortDebtsByStrategy(debts, strategy);
  const budget = Math.max(0, monthlyBudget);
  const required = ordered.map((debt) => Math.min(debt.currentBalance, getMonthlyCommitment(debt)));
  const requiredTotal = required.reduce((sum, amount) => sum + amount, 0);

  if (budget < requiredTotal && requiredTotal > 0) {
    const ratio = budget / requiredTotal;
    return ordered.map((debt, index) => ({
      debtId: debt.id,
      priority: index + 1,
      basePayment: Math.round(required[index] * ratio),
      extraPayment: 0,
      recommendedPayment: Math.round(required[index] * ratio)
    }));
  }

  let extraBudget = Math.max(0, budget - requiredTotal);
  return ordered.map((debt, index) => {
    const basePayment = required[index];
    const extraPayment = Math.min(Math.max(0, debt.currentBalance - basePayment), extraBudget);
    extraBudget -= extraPayment;
    return {
      debtId: debt.id,
      priority: index + 1,
      basePayment,
      extraPayment,
      recommendedPayment: basePayment + extraPayment
    };
  });
};
