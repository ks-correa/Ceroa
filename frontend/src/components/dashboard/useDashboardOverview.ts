import { useMemo, useState } from 'react';
import { simulationService } from '../../services/simulationService';
import { Debt, PaymentRecord, StrategyType } from '../../types';
import { maskFinancialValue } from '../../utils/formatters';
import { formatRelativeDueDate, getCalendarDayDifference, getDaysInMonth } from '../../utils/date';

const resolveDueDate = (debt: Debt, referenceDate: Date): Date => {
  const persistedDate = new Date(`${debt.nextDueDate.slice(0, 10)}T12:00:00`);
  if (!Number.isNaN(persistedDate.getTime())) return persistedDate;

  const dueDay = Math.max(1, Math.min(31, debt.dueDateDay));
  const createDate = (year: number, monthIndex: number) => new Date(
    year,
    monthIndex,
    Math.min(dueDay, getDaysInMonth(year, monthIndex)),
    12
  );
  let fallback = createDate(referenceDate.getFullYear(), referenceDate.getMonth());
  if (fallback < referenceDate) {
    const nextMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
    fallback = createDate(nextMonth.getFullYear(), nextMonth.getMonth());
  }
  return fallback;
};

export const useDashboardOverview = (debts: Debt[], payments: PaymentRecord[], strategy: StrategyType) => {
  const [hideBalances, setHideBalances] = useState(false);
  const [today] = useState(() => new Date());
  const upcomingDebts = useMemo(
    () => debts.filter((debt) => debt.currentBalance > 0).map((debt) => {
      const dueDate = resolveDueDate(debt, today);
      const daysUntilDue = getCalendarDayDifference(dueDate, today);
      const relativeLabel = formatRelativeDueDate(daysUntilDue);
      return { debt, dueDate, daysUntilDue, relativeLabel };
    }).sort((first, second) => first.dueDate.getTime() - second.dueDate.getTime()),
    [debts, today]
  );
  const prioritizedDebts = useMemo(
    () => simulationService.sortDebtsByStrategy(debts, strategy),
    [debts, strategy]
  );
  const monthlyPaymentActivity = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - offset), 1);
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
        amount: 0
      };
    });
    const byKey = new Map(months.map((month) => [month.key, month]));
    payments.filter((payment) => payment.status === 'completed').forEach((payment) => {
      const month = byKey.get(payment.date.slice(0, 7));
      if (month) month.amount += payment.amount;
    });
    const maxAmount = Math.max(...months.map((month) => month.amount), 1);
    return months.map((month) => ({ ...month, percentage: (month.amount / maxAmount) * 100 }));
  }, [payments, today]);

  return {
    hideBalances,
    setHideBalances,
    upcomingDebts,
    monthlyPaymentActivity,
    topPriorityDebt: prioritizedDebts[0],
    maskValue: (value: string) => maskFinancialValue(value, hideBalances)
  };
};
