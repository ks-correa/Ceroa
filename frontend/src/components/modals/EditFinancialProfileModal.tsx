import React, { useEffect, useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EditFinancialProfileModal: React.FC = () => {
  const { 
    isEditFinancialOpen, 
    setIsEditFinancialOpen, 
    financialProfile, 
    handleUpdateFinancialProfile,
    formatCurrency 
  } = useApp();

  const [income, setIncome] = useState(financialProfile.monthlyIncome);
  const [expenses, setExpenses] = useState(financialProfile.fixedExpenses);
  const [available, setAvailable] = useState(financialProfile.availableMoney);
  const [declaredDebts, setDeclaredDebts] = useState(financialProfile.totalDeclaredDebts);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditFinancialOpen) return;
    setIncome(financialProfile.monthlyIncome);
    setExpenses(financialProfile.fixedExpenses);
    setAvailable(financialProfile.availableMoney);
    setDeclaredDebts(financialProfile.totalDeclaredDebts);
    setError(null);
  }, [isEditFinancialOpen, financialProfile]);

  if (!isEditFinancialOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (expenses > income || available > income - expenses) {
      setError('El dinero disponible no puede superar los ingresos restantes después de gastos.');
      return;
    }
    try {
      setIsSaving(true);
      await handleUpdateFinancialProfile({
        monthlyIncome: Number(income),
        fixedExpenses: Number(expenses),
        availableMoney: Number(available),
        totalDeclaredDebts: Number(declaredDebts)
      });
      setIsEditFinancialOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar el perfil financiero.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="financial-profile-modal-title">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 id="financial-profile-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Editar Perfil Financiero
              </h3>
              <p className="text-xs text-slate-500">Ajusta tus ingresos y gastos para recalcular capacidad</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditFinancialOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Cerrar edición de perfil financiero"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">{error}</div>}
          
          <div className="space-y-1">
            <label htmlFor="financial-income" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ingresos Mensuales Promedio ($)
            </label>
            <input
              id="financial-income"
              type="number"
              min="0.01"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="financial-available" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dinero disponible para deudas ($)</label>
            <input id="financial-available" type="number" min="0" max={Math.max(0, income - expenses)} value={available} onChange={(e) => setAvailable(Number(e.target.value))} required className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
          </div>

          <div className="space-y-1">
            <label htmlFor="financial-declared-debts" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cantidad total de deudas declaradas</label>
            <input id="financial-declared-debts" type="number" min="1" step="1" value={declaredDebts} onChange={(e) => setDeclaredDebts(Number(e.target.value))} required className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
          </div>

          <div className="space-y-1">
            <label htmlFor="financial-expenses" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Gastos Fijos Estimados ($)
            </label>
            <input
              id="financial-expenses"
              type="number"
              min="0"
              value={expenses}
              onChange={(e) => setExpenses(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-teal-50 dark:bg-slate-800 border border-teal-100 dark:border-slate-700 text-xs flex justify-between items-center">
            <span className="text-slate-600 dark:text-slate-400">Disponible para deudas:</span>
            <strong className="text-teal-800 dark:text-cyan-300 text-sm">{formatCurrency(available)}</strong>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditFinancialOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 disabled:opacity-60 rounded-xl shadow-xs"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
