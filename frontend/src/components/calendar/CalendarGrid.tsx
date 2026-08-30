import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarCommitment } from '../../types';
import { DAYS_OF_WEEK, MONTH_NAMES } from '../../utils/date';

interface CalendarGridProps {
  year: number;
  monthIndex: number;
  selectedDay: number;
  totalDays: number;
  firstDayIndex: number;
  commitments: CalendarCommitment[];
  today: Date;
  onSelectDay: (day: number) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  year, monthIndex, selectedDay, totalDays, firstDayIndex, commitments, today,
  onSelectDay, onPreviousMonth, onNextMonth
}) => (
  <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{MONTH_NAMES[monthIndex]} {year}</h2>
      <div className="flex items-center gap-1.5">
        <button id="calendar-prev-month-btn" onClick={onPreviousMonth} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer" aria-label="Mostrar mes anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button id="calendar-next-month-btn" onClick={onNextMonth} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer" aria-label="Mostrar mes siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
      {DAYS_OF_WEEK.map((day) => <div key={day} className="py-1">{day}</div>)}
    </div>

    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: firstDayIndex }, (_, index) => (
        <div key={`empty-${index}`} className="h-12 sm:h-14 rounded-2xl" aria-hidden="true" />
      ))}
      {Array.from({ length: totalDays }, (_, index) => {
        const dayNumber = index + 1;
        const isSelected = selectedDay === dayNumber;
        const dayItems = commitments.filter((commitment) => commitment.day === dayNumber);
        const hasPending = dayItems.some((commitment) => commitment.status === 'pending');

        return (
          <button
            key={dayNumber}
            id={`calendar-day-${dayNumber}`}
            onClick={() => onSelectDay(dayNumber)}
            aria-pressed={isSelected}
            aria-label={`${dayNumber} de ${MONTH_NAMES[monthIndex]}${dayItems.length ? `, ${dayItems.length} compromisos` : ''}`}
            className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${isSelected ? 'bg-[var(--ceroa-primary)] text-white font-extrabold shadow-sm scale-105 z-10' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium'}`}
          >
            <span className="text-xs sm:text-sm">{dayNumber}</span>
            {dayItems.length > 0 && (
              <span className={`w-1.5 h-1.5 mt-1 rounded-full ${isSelected ? 'bg-white' : hasPending ? 'bg-[var(--ceroa-primary)]' : 'bg-emerald-500'}`} />
            )}
          </button>
        );
      })}
    </div>

    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-600" />Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Pagado</span>
      </div>
      <span>Hoy: {today.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}</span>
    </div>
  </section>
);
