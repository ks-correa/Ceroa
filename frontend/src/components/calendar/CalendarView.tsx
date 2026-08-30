import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  ArrowRight,
  PlusCircle,
  Landmark,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calendarService } from '../../services/calendarService';
import { CalendarCommitment } from '../../types';

export const CalendarView: React.FC = () => {
  const { 
    debts, 
    formatCurrency, 
    openRecordPaymentModal
  } = useApp();

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [commitments, setCommitments] = useState<CalendarCommitment[]>([]);
  const [hideBalances, setHideBalances] = useState(false);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  useEffect(() => {
    const fetchCommitments = async () => {
      const list = await calendarService.getCommitmentsForMonth(currentYear, currentMonthIndex);
      setCommitments(list);
    };
    fetchCommitments();
  }, [currentYear, currentMonthIndex, debts]);

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  // Days in month
  const totalDays = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonthIndex, 1).getDay() + 6) % 7; // Monday as 0

  const dayCommitments = commitments.filter((c) => c.day === selectedDay);

  const handleMarkPaid = (commitment: CalendarCommitment) => {
    openRecordPaymentModal(commitment.debtId);
  };

  const maskValue = (formatted: string) => {
    return hideBalances ? '••••••••' : formatted;
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Vencimientos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organiza y anticipa tus compromisos financieros.
          </p>
        </div>

        <button
          onClick={() => setHideBalances(!hideBalances)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 self-start sm:self-auto cursor-pointer"
        >
          {hideBalances ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-teal-600" />}
          <span>{hideBalances ? 'Mostrar montos' : 'Ocultar montos'}</span>
        </button>
      </div>

      {/* Main Grid: Calendar on Left (7 cols), Selected Day Panel on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar Grid (Page 14 of PDF) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
          
          {/* Month Navigator Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {monthNames[currentMonthIndex]} {currentYear}
            </h2>

            <div className="flex items-center gap-1.5">
              <button
                id="calendar-prev-month-btn"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="calendar-next-month-btn"
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {daysOfWeek.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty offset cells */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-12 sm:h-14 rounded-2xl" />
            ))}

            {/* Days cells */}
            {Array.from({ length: totalDays }).map((_, idx) => {
              const dayNumber = idx + 1;
              const isSelected = selectedDay === dayNumber;
              const hasCommitment = commitments.some((c) => c.day === dayNumber);
              const hasPending = commitments.some((c) => c.day === dayNumber && c.status === 'pending');

              return (
                <button
                  key={dayNumber}
                  id={`calendar-day-${dayNumber}`}
                  onClick={() => setSelectedDay(dayNumber)}
                  className={`h-12 sm:h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#008FA6] text-white font-extrabold shadow-sm scale-105 z-10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{dayNumber}</span>

                  {/* Dot Indicator */}
                  {hasCommitment && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isSelected 
                          ? 'bg-white' 
                          : hasPending 
                            ? 'bg-[#008FA6]' 
                            : 'bg-emerald-500'
                      }`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
                Pendiente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Pagado
              </span>
            </div>
            <span>Hoy: 15 de Octubre</span>
          </div>

        </div>

        {/* Selected Day Commitments Panel (Page 14 of PDF) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {selectedDay} de {monthNames[currentMonthIndex]}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dayCommitments.length} compromiso{dayCommitments.length === 1 ? '' : 's'} programado{dayCommitments.length === 1 ? '' : 's'}
              </p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>

          {/* List of Day Commitments */}
          {dayCommitments.length > 0 ? (
            <div className="space-y-4">
              {dayCommitments.map((com) => {
                const isPending = com.status === 'pending';

                return (
                  <div
                    key={com.id}
                    className={`p-5 rounded-2xl border transition-all space-y-3 ${
                      isPending
                        ? 'bg-cyan-50/40 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800/60 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-850 border-slate-200/60 dark:border-slate-800 opacity-90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isPending ? 'bg-cyan-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'}`}>
                          {com.debtType === 'credit_card' ? <CreditCard className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {com.debtName}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {com.typeLabel}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        isPending
                          ? 'bg-cyan-100 dark:bg-cyan-950 text-teal-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
                          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200'
                      }`}>
                        {isPending ? 'PENDIENTE' : '✓ PAGADO'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-slate-400 font-medium">
                        {isPending ? 'Monto a pagar' : 'Monto pagado'}
                      </span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {maskValue(formatCurrency(com.amount))}
                      </span>
                    </div>

                    {/* Action */}
                    {isPending && (
                      <button
                        onClick={() => handleMarkPaid(com)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#008FA6] hover:bg-[#007A8E] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      >
                        <span>Registrar Pago</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-medium">No hay compromisos en esta fecha.</p>
              <p className="text-[11px] text-slate-400">Selecciona el día 15 o 20 para ver vencimientos.</p>
            </div>
          )}

          {/* Quick Add reminder / payment */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => openRecordPaymentModal()}
              className="w-full py-2.5 text-xs font-bold text-teal-700 dark:text-cyan-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-center"
            >
              + Registrar abono libre para otra fecha
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
