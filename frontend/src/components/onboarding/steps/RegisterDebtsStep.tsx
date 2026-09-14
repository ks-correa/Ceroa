import React, { useState } from 'react';
import { Plus, Trash2, Landmark, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { Debt } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { useApp } from '../../../context/AppContext';

interface RegisterDebtsStepProps {
  debts: Debt[];
  totalDeclaredDebts: number;
  userPlan: 'cero' | 'plus';
  onNext: () => void;
  onBack: () => void;
}

export const RegisterDebtsStep: React.FC<RegisterDebtsStepProps> = ({
  debts,
  totalDeclaredDebts,
  userPlan,
  onNext,
  onBack
}) => {
  const { setIsAddDebtOpen, handleDeleteDebt, setIsSubscriptionModalOpen } = useApp();
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxAllowed = userPlan === 'cero' ? 2 : Infinity;
  const isLimitReached = userPlan === 'cero' && debts.length >= 2;

  const handleOpenAddModal = () => {
    setError(null);
    if (isLimitReached) {
      setLimitModalOpen(true);
      return;
    }
    setIsAddDebtOpen(true);
  };

  const handleNextClick = () => {
    setError(null);
    if (debts.length === 0) {
      setError('Debes registrar al menos una deuda antes de continuar.');
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Registrar deudas iniciales</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Registra las obligaciones financieras reales que Ceroa priorizará en tu estrategia.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Counter Header */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Obligaciones registradas</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {debts.length} {userPlan === 'cero' ? `de ${maxAllowed} permitidas en Plan Cero` : `de ${totalDeclaredDebts} declaradas`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar deuda</span>
          </button>
        </div>

        {/* Debts List */}
        {debts.length === 0 ? (
          <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Aún no has agregado ninguna deuda</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Agrega al menos una obligación financiera para continuar con tu configuración.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar mi primera deuda</span>
            </button>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Lista de deudas registradas">
            {debts.map((debt) => (
              <li
                key={debt.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{debt.name}</h3>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-cyan-300">
                      {debt.categoryLabel || debt.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{debt.entity}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Saldo actual</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(debt.currentBalance)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteDebt(debt.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    aria-label={`Eliminar deuda ${debt.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalDeclaredDebts > debts.length && (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center">
            Declara {totalDeclaredDebts} deudas y has detallado {debts.length}. Podrás avanzar manteniendo la cantidad declarada.
          </p>
        )}

        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            onClick={onBack}
            className="w-1/3 py-3 px-4 rounded-xl font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs text-center"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={handleNextClick}
            disabled={debts.length === 0}
            className="w-2/3 py-3 px-6 rounded-xl font-bold text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 text-xs"
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Plan Cero Limit Warning Modal */}
      {limitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Límite del Plan Cero alcanzado</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Tu cuenta actual en plan <strong>Cero</strong> te permite detallar un máximo de <strong>2 obligaciones financieras</strong>. Tus datos declarados conservarán la cantidad total, pero para agregar deudas adicionales en el sistema se requiere Ceroa Plus.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setLimitModalOpen(false);
                  setIsSubscriptionModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-700 to-cyan-600 hover:from-teal-800 hover:to-cyan-700 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Conocer Ceroa Plus</span>
              </button>
              <button
                type="button"
                onClick={() => setLimitModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Entendido, continuar con mis deudas actuales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
