import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Landmark, Flame, Snowflake, DollarSign, Wallet, PiggyBank, Edit2, AlertCircle } from 'lucide-react';
import { Debt, FinancialProfile, StrategyType } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';

interface ReviewStepProps {
  financialProfile: FinancialProfile;
  debts: Debt[];
  onComplete: () => Promise<void>;
  onGoToStep: (stepIndex: number) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  financialProfile,
  debts,
  onComplete,
  onGoToStep,
  onBack,
  isSubmitting
}) => {
  const [error, setError] = useState<string | null>(null);

  const totalDeclared = financialProfile.totalDeclaredDebts || 1;
  const registeredCount = debts.length;
  const isPartialCoverage = totalDeclared > registeredCount;

  const totalBalance = debts.reduce((sum, d) => sum + d.currentBalance, 0);

  const handleFinalize = async () => {
    setError(null);
    if (registeredCount < 1) {
      setError('Debes registrar al menos una deuda antes de finalizar.');
      return;
    }
    if (!financialProfile.activeStrategy) {
      setError('Debes seleccionar una estrategia de pago (Bola de Nieve o Avalancha) antes de finalizar.');
      return;
    }

    try {
      await onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al finalizar la configuración inicial.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Revisar y finalizar configuración</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Confirma que tu información financiera inicial sea correcta antes de habilitar el acceso a Inicio.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Partial Coverage Warning */}
        {isPartialCoverage && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <span className="font-bold block">Advertencia de cobertura parcial</span>
              <span>
                Has declarado <strong>{totalDeclared}</strong> deudas en total, pero únicamente has registrado <strong>{registeredCount}</strong> obligaciones en detalle. Los análisis y proyecciones de Ceroa cubrirán únicamente las <strong>{registeredCount}</strong> obligaciones efectivamente registradas.
              </span>
            </div>
          </div>
        )}

        {/* Section 1: Situación Financiera */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              1. Situación Financiera
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(0)}
              className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-teal-600" /> Ingresos
              </span>
              <strong className="text-sm text-slate-900 dark:text-white block mt-1">
                {formatCurrency(financialProfile.monthlyIncome)}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-slate-600" /> Gastos esenciales
              </span>
              <strong className="text-sm text-slate-900 dark:text-white block mt-1">
                {formatCurrency(financialProfile.fixedExpenses)}
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500 dark:text-slate-400 block font-medium flex items-center gap-1">
                <PiggyBank className="w-3.5 h-3.5 text-cyan-600" /> Disponible deudas
              </span>
              <strong className="text-sm text-teal-800 dark:text-cyan-300 block mt-1">
                {formatCurrency(financialProfile.availableMoney)}
              </strong>
            </div>
          </div>
        </div>

        {/* Section 2: Deudas Declaradas y Registradas */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Deudas Registradas ({registeredCount} de {totalDeclared} declaradas)
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          </div>

          <ul className="space-y-2" aria-label="Resumen de deudas registradas">
            {debts.map((d) => (
              <li key={d.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{d.name}</span>
                  <span className="text-slate-500">{d.entity} • {d.categoryLabel || d.type}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(d.currentBalance)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-xs font-bold text-slate-900 dark:text-white">
            <span>Saldo total registrado:</span>
            <span className="text-teal-800 dark:text-cyan-300">{formatCurrency(totalBalance)}</span>
          </div>
        </div>

        {/* Section 3: Estrategia Seleccionada */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              3. Estrategia Activa
            </h3>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-300">
              {financialProfile.activeStrategy === 'avalanche' ? (
                <Flame className="w-5 h-5 text-amber-500" />
              ) : (
                <Snowflake className="w-5 h-5 text-cyan-500" />
              )}
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-white block">
                {financialProfile.activeStrategy === 'avalanche' ? 'Avalancha' : 'Bola de Nieve'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {financialProfile.activeStrategy === 'avalanche'
                  ? 'Prioriza primero las deudas con mayor tasa de interés.'
                  : 'Prioriza primero las deudas con menor saldo actual.'}
              </span>
            </div>
          </div>
        </div>

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
            onClick={handleFinalize}
            disabled={isSubmitting}
            className="w-2/3 py-3 px-6 rounded-xl font-bold text-white bg-gradient-to-r from-teal-700 to-cyan-600 hover:from-teal-800 hover:to-cyan-700 disabled:opacity-60 transition-all shadow-md flex items-center justify-center gap-2 text-xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Finalizando...' : 'Confirmar y finalizar configuración'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
