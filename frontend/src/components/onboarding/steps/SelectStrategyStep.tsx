import React, { useState } from 'react';
import { Flame, Snowflake, Check, AlertCircle } from 'lucide-react';
import { StrategyType } from '../../../types';

interface SelectStrategyStepProps {
  initialStrategy: StrategyType;
  onSave: (strategy: StrategyType) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

export const SelectStrategyStep: React.FC<SelectStrategyStepProps> = ({
  initialStrategy,
  onSave,
  onBack,
  isSaving
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(initialStrategy || 'snowball');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStrategy) {
      setError('Debe seleccionar una estrategia de pago (Bola de Nieve o Avalancha) para continuar.');
      return;
    }

    try {
      await onSave(selectedStrategy);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al guardar la estrategia seleccionada.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Selecciona tu estrategia de pago inicial</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Elige cómo deseas que Ceroa priorice el pago adicional de tus obligaciones. Ambas estrategias están disponibles en tu plan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Estrategias de pago disponibles">
          {/* Bola de Nieve */}
          <div
            role="radio"
            aria-checked={selectedStrategy === 'snowball'}
            tabIndex={0}
            onClick={() => setSelectedStrategy('snowball')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setSelectedStrategy('snowball');
              }
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              selectedStrategy === 'snowball'
                ? 'border-[var(--ceroa-primary)] bg-teal-50/40 dark:bg-teal-950/30 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
                <Snowflake className="w-5 h-5" />
              </div>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                selectedStrategy === 'snowball'
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {selectedStrategy === 'snowball' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Bola de Nieve
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  Menor saldo primero
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Prioriza la deuda con menor saldo actual para liquidar compromisos rápidamente y generar impulso motivacional constante.
              </p>
            </div>
          </div>

          {/* Avalancha */}
          <div
            role="radio"
            aria-checked={selectedStrategy === 'avalanche'}
            tabIndex={0}
            onClick={() => setSelectedStrategy('avalanche')}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setSelectedStrategy('avalanche');
              }
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between space-y-4 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              selectedStrategy === 'avalanche'
                ? 'border-[var(--ceroa-primary)] bg-teal-50/40 dark:bg-teal-950/30 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                selectedStrategy === 'avalanche'
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-slate-300 dark:border-slate-600'
              }`}>
                {selectedStrategy === 'avalanche' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Avalancha
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Mayor interés primero
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Prioriza la deuda con mayor tasa de interés para minimizar el costo financiero acumulado y reducir los intereses pagados en el tiempo.
              </p>
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
            type="submit"
            disabled={isSaving}
            className="w-2/3 py-3 px-6 rounded-xl font-bold text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 transition-all shadow-md flex items-center justify-center gap-2 text-xs"
          >
            {isSaving ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </div>
      </form>
    </div>
  );
};

