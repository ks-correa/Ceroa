import { CalendarCommitment, Debt } from '../types';
import { debtService } from './debtService';

export const calendarService = {
  async getCommitmentsForMonth(year: number, monthIndex: number): Promise<CalendarCommitment[]> {
    const debts: Debt[] = await debtService.getDebts();
    
    // Generate commitments from debts for the given month
    const commitments: CalendarCommitment[] = debts.map((debt) => {
      const day = Math.min(debt.dueDateDay || 15, 28);
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const isCard = debt.type === 'credit_card';
      const isPending = debt.status !== 'pagada';

      return {
        id: `com-${debt.id}-${year}-${monthIndex}`,
        debtId: debt.id,
        debtName: debt.name,
        debtType: debt.type,
        amount: isCard ? debt.minimumPayment : debt.monthlyPayment,
        dueDate: dateStr,
        day,
        status: isPending ? 'pending' : 'paid',
        urgencyLabel: day === 15 ? 'Vence hoy' : day < 15 ? 'Vencido' : `En ${day - 15} días`,
        typeLabel: isCard ? 'Pago mínimo COP' : 'Cuota fija COP'
      };
    });

    return commitments;
  }
};
