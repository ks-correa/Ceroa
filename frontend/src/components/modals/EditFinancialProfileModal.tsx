import React, { useEffect, useState } from 'react';
import { X, TrendingUp, DollarSign } from 'lucide-react';
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

  useEffect(() => {
    if (!isEditFinancialOpen) return;
    setIncome(financialProfile.monthlyIncome);
    setExpenses(financialProfile.fixedExpenses);
    setAvailable(financialProfile.availableMoney);
    setDeclaredDebts(financialProfile.totalDeclaredDebts);
  }, [isEditFinancialOpen, financialProfile]);

  if (!isEditFinancialOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUpdateFinancialProfile({
      monthlyIncome: Number(income),
      fixedExpenses: Number(expenses),
      availableMoney: Number(available),
      totalDeclaredDebts: Number(declaredDebts)
    });
    setIsEditFinancialOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Perfil Financiero
              </h3>
              <p className="text-xs text-slate-500">Ajusta tus ingresos y gastos para recalcular capacidad</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditFinancialOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ingresos Mensuales Promedio ($)
            </label>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dinero disponible para deudas ($)</label>
            <input type="number" min="0" value={available} onChange={(e) => setAvailable(Number(e.target.value))} required className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cantidad total de deudas declaradas</label>
            <input type="number" min="1" step="1" value={declaredDebts} onChange={(e) => setDeclaredDebts(Number(e.target.value))} required className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Gastos Fijos Estimados ($)
            </label>
            <input
              type="number"
              value={expenses}
              onChange={(e) => setExpenses(Number(e.target.value))}
              required
              className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-teal-50 dark:bg-slate-850 border border-teal-100 dark:border-slate-700 text-xs flex justify-between items-center">
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
              className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 rounded-xl shadow-xs"
            >
              Guardar Cambios
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
