import { useMemo, useState } from 'react';
import { simulationService } from '../../services/simulationService';
import { Debt, StrategyType } from '../../types';
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

export const useDashboardOverview = (debts: Debt[], strategy: StrategyType) => {
  const [hideBalances, setHideBalances] = useState(false);
  const [today] = useState(() => new Date());
  const upcomingDebts = useMemo(
    () => debts.map((debt) => {
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

  return {
    hideBalances,
    setHideBalances,
    upcomingDebts,
    topPriorityDebt: prioritizedDebts[0],
    maskValue: (value: string) => maskFinancialValue(value, hideBalances)
  };
};
