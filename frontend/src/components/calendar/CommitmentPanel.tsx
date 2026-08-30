import React from 'react';
import { ArrowRight, Calendar as CalendarIcon, CheckCircle2, CreditCard, Landmark } from 'lucide-react';
import { CalendarCommitment } from '../../types';
import { MONTH_NAMES } from '../../utils/date';

interface CommitmentPanelProps {
  day: number;
  monthIndex: number;
  commitments: CalendarCommitment[];
  formatAmount: (amount: number) => string;
  onRecordPayment: (debtId?: string) => void;
}

export const CommitmentPanel: React.FC<CommitmentPanelProps> = ({
  day, monthIndex, commitments, formatAmount, onRecordPayment
}) => (
  <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
      <div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{day} de {MONTH_NAMES[monthIndex]}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {commitments.length} compromiso{commitments.length === 1 ? '' : 's'} programado{commitments.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 flex items-center justify-center"><CalendarIcon className="w-5 h-5" /></div>
    </div>

    {commitments.length > 0 ? (
      <div className="space-y-4">
        {commitments.map((commitment) => {
          const isPending = commitment.status === 'pending';
          return (
            <article key={commitment.id} className={`p-5 rounded-2xl border transition-all space-y-3 ${isPending ? 'bg-cyan-50/40 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800/60 shadow-2xs' : 'bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-800 opacity-90'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isPending ? 'bg-cyan-600 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'}`}>
                    {commitment.debtType === 'credit_card' ? <CreditCard className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{commitment.debtName}</h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{commitment.typeLabel}</span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isPending ? 'bg-cyan-100 dark:bg-cyan-950 text-teal-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200'}`}>
                  {isPending ? 'PENDIENTE' : '✓ PAGADO'}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-400 font-medium">{isPending ? 'Monto a pagar' : 'Monto pagado'}</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">{formatAmount(commitment.amount)}</span>
              </div>
              {isPending && (
                <button onClick={() => onRecordPayment(commitment.debtId)} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer">
                  <span>Registrar Pago</span><ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </article>
          );
        })}
      </div>
    ) : (
      <div className="py-12 text-center text-slate-400 space-y-2">
        <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-xs font-medium">No hay compromisos en esta fecha.</p>
        <p className="text-[11px] text-slate-400">Selecciona un día marcado para ver sus vencimientos.</p>
      </div>
    )}

    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
      <button onClick={() => onRecordPayment()} className="w-full py-2.5 text-xs font-bold text-teal-700 dark:text-cyan-400 hover:bg-teal-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-center">+ Registrar abono libre para otra fecha</button>
    </div>
  </section>
);
