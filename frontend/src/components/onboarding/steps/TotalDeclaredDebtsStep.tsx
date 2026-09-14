import React, { useState, useEffect } from 'react';
import { Hash, AlertCircle, Info } from 'lucide-react';

interface TotalDeclaredDebtsStepProps {
  initialDeclaredDebts: number;
  userPlan: 'cero' | 'plus';
  onSave: (declaredCount: number) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

export const TotalDeclaredDebtsStep: React.FC<TotalDeclaredDebtsStepProps> = ({
  initialDeclaredDebts,
  userPlan,
  onSave,
  onBack,
  isSaving
}) => {
  const [declaredDebts, setDeclaredDebts] = useState<number | ''>(initialDeclaredDebts || 1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDeclaredDebts >= 1) {
      setDeclaredDebts(initialDeclaredDebts);
    }
  }, [initialDeclaredDebts]);

  const countNum = Number(declaredDebts) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!declaredDebts || countNum < 1 || !Number.isInteger(countNum)) {
      setError('La cantidad total de deudas debe ser un número entero positivo (mínimo 1).');
      return;
    }

    try {
      await onSave(countNum);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al guardar la cantidad declarada.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cantidad total de deudas</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Declara la cantidad total de obligaciones financieras que posees actualmente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {error && (
          <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="total-declared-debts-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            ¿Cuántas deudas tienes en total? *
          </label>
          <div className="relative">
            <Hash className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              id="total-declared-debts-input"
              type="number"
              min="1"
              step="1"
              placeholder="Ej. 3"
              value={declaredDebts}
              onChange={(e) => {
                const val = e.target.value;
                setDeclaredDebts(val === '' ? '' : Math.max(1, parseInt(val, 10) || 1));
              }}
              required
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        {userPlan === 'cero' && countNum > 2 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <span className="font-bold block">Aviso de plan Cero:</span>
              <span>
                Has declarado <strong>{countNum}</strong> deudas. Tu plan Cero te permite registrar en detalle hasta <strong>2 obligaciones</strong> para construir tu plan de pago inicial. Se conservará la cantidad total declarada ({countNum}) para los indicadores de cobertura.
              </span>
            </div>
          </div>
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

