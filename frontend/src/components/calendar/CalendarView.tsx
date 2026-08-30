import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, maskFinancialValue } from '../../utils/formatters';
import { CalendarGrid } from './CalendarGrid';
import { CommitmentPanel } from './CommitmentPanel';
import { useCalendar } from './useCalendar';

export const CalendarView: React.FC = () => {
  const { debts, payments, preferences, openRecordPaymentModal } = useApp();
  const [hideBalances, setHideBalances] = useState(false);
  const calendar = useCalendar(debts, payments);
  const formatAmount = (amount: number) => maskFinancialValue(
    formatCurrency(amount, preferences.currency),
    hideBalances
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Vencimientos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organiza y anticipa tus compromisos financieros.</p>
        </div>
        <button onClick={() => setHideBalances((hidden) => !hidden)} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 self-start sm:self-auto cursor-pointer" aria-pressed={hideBalances}>
          {hideBalances ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-teal-600" />}
          <span>{hideBalances ? 'Mostrar montos' : 'Ocultar montos'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <CalendarGrid
          year={calendar.currentYear}
          monthIndex={calendar.currentMonthIndex}
          selectedDay={calendar.selectedDay}
          totalDays={calendar.totalDays}
          firstDayIndex={calendar.firstDayIndex}
          commitments={calendar.commitments}
          today={calendar.today}
          onSelectDay={calendar.setSelectedDay}
          onPreviousMonth={calendar.showPreviousMonth}
          onNextMonth={calendar.showNextMonth}
        />
        <CommitmentPanel
          day={calendar.selectedDay}
          monthIndex={calendar.currentMonthIndex}
          commitments={calendar.dayCommitments}
          formatAmount={formatAmount}
          onRecordPayment={openRecordPaymentModal}
        />
      </div>
    </div>
  );
};
