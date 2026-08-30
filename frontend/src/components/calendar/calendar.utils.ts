import { CalendarCommitment, Debt, PaymentRecord } from '../../types';
import {
  formatRelativeDueDate,
  getCalendarDayDifference,
  getDaysInMonth,
  toLocalIsoDate
} from '../../utils/date';
import { getMonthlyCommitment } from '../../utils/financial';

const parseIsoDate = (value: string): Date => new Date(`${value.slice(0, 10)}T12:00:00`);

const getCommitmentAmount = (debt: Debt): number =>
  debt.type === 'credit_card' ? debt.minimumPayment : getMonthlyCommitment(debt);

const getPaymentTotalForMonth = (
  payments: PaymentRecord[],
  debtId: string,
  year: number,
  monthIndex: number
): number => payments.reduce((total, payment) => {
  const paymentDate = parseIsoDate(payment.date);
  const isSameDebtAndMonth = payment.debtId === debtId
    && paymentDate.getFullYear() === year
    && paymentDate.getMonth() === monthIndex
    && payment.status === 'completed';
  return isSameDebtAndMonth ? total + payment.amount : total;
}, 0);

export const buildCalendarCommitments = (
  debts: Debt[],
  payments: PaymentRecord[],
  year: number,
  monthIndex: number,
  referenceDate = new Date()
): CalendarCommitment[] => {
  const lastDayOfMonth = getDaysInMonth(year, monthIndex);

  return debts.map((debt) => {
    const day = Math.min(Math.max(debt.dueDateDay || 1, 1), lastDayOfMonth);
    const dueDate = new Date(year, monthIndex, day, 12);
    const amount = getCommitmentAmount(debt);
    const paidThisMonth = getPaymentTotalForMonth(payments, debt.id, year, monthIndex);
    const isPaid = debt.status === 'pagada' || (amount > 0 && paidThisMonth >= amount);

    return {
      id: `commitment-${debt.id}-${year}-${monthIndex + 1}`,
      debtId: debt.id,
      debtName: debt.name,
      debtType: debt.type,
      amount,
      dueDate: toLocalIsoDate(dueDate),
      day,
      status: isPaid ? 'paid' : 'pending',
      urgencyLabel: formatRelativeDueDate(getCalendarDayDifference(dueDate, referenceDate)),
      typeLabel: debt.type === 'credit_card' ? 'Pago mínimo' : 'Cuota mensual'
    };
  });
};
