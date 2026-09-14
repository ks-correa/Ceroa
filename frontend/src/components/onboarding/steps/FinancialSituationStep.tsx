import React, { useState, useEffect } from 'react';
import { DollarSign, Wallet, PiggyBank, AlertCircle } from 'lucide-react';
import { FinancialProfile } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';


interface FinancialSituationStepProps {
  initialProfile: FinancialProfile;
  onSave: (data: { monthlyIncome: number; fixedExpenses: number; availableMoney: number }) => Promise<void>;
  isSaving: boolean;
}

export const FinancialSituationStep: React.FC<FinancialSituationStepProps> = ({
  initialProfile,
  onSave,
  isSaving
}) => {
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>(initialProfile.monthlyIncome || '');
  const [fixedExpenses, setFixedExpenses] = useState<number | ''>(initialProfile.fixedExpenses || '');
  const [availableMoney, setAvailableMoney] = useState<number | ''>(initialProfile.availableMoney || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile.monthlyIncome > 0) {
      setMonthlyIncome(initialProfile.monthlyIncome);
      setFixedExpenses(initialProfile.fixedExpenses);
      setAvailableMoney(initialProfile.availableMoney);
    }
  }, [initialProfile]);

  const incomeNum = Number(monthlyIncome) || 0;
  const expensesNum = Number(fixedExpenses) || 0;
  const availableNum = Number(availableMoney) || 0;
  const remainingIncome = Math.max(0, incomeNum - expensesNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!monthlyIncome || incomeNum <= 0) {
      setError('Los ingresos mensuales deben ser mayores a $0 COP.');
      return;
    }
    if (fixedExpenses === '' || expensesNum < 0) {
      setError('Los gastos esenciales no pueden ser negativos.');
      return;
    }
    if (availableMoney === '' || availableNum < 0) {
      setError('El dinero disponible para deudas no puede ser negativo.');
      return;
    }
    if (expensesNum > incomeNum) {
      setError('Los gastos esenciales no pueden superar tus ingresos mensuales.');
      return;
    }
    if (availableNum > remainingIncome) {
      setError('El dinero disponible para deudas no puede superar tus ingresos restantes después de gastos esenciales.');
      return;
    }

    try {
      await onSave({
        monthlyIncome: incomeNum,
        fixedExpenses: expensesNum,
        availableMoney: availableNum
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al guardar la situación financiera.');
    }
  };

  const inputStyle = "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Situación financiera inicial</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Registra tus ingresos, gastos esenciales y el dinero disponible que destinarás mensualmente al pago de deudas.
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
          <label htmlFor="monthly-income-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Ingresos mensuales ($ COP) *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              id="monthly-income-input"
              type="number"
              min="1"
              step="1000"
              placeholder="Ej. 5000000"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value === '' ? '' : Number(e.target.value))}
              required
              className={inputStyle}
            />
          </div>
          {incomeNum > 0 && (
            <p className="text-xs text-teal-700 dark:text-cyan-400 font-medium pl-1">
              Valor: {formatCurrency(incomeNum)}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fixed-expenses-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Gastos esenciales mensuales ($ COP) *
          </label>
          <div className="relative">
            <Wallet className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              id="fixed-expenses-input"
              type="number"
              min="0"
              step="1000"
              placeholder="Ej. 2500000"
              value={fixedExpenses}
              onChange={(e) => setFixedExpenses(e.target.value === '' ? '' : Number(e.target.value))}
              required
              className={inputStyle}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
            Arriendo, alimentación, servicios, salud y necesidades básicas.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="available-money-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Dinero disponible para deudas ($ COP) *
          </label>
          <div className="relative">
            <PiggyBank className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              id="available-money-input"
              type="number"
              min="0"
              max={remainingIncome}
              step="1000"
              placeholder="Ej. 1000000"
              value={availableMoney}
              onChange={(e) => setAvailableMoney(e.target.value === '' ? '' : Number(e.target.value))}
              required
              className={inputStyle}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 pl-1">
            Monto máximo que puedes destinar cada mes para pagar tus obligaciones.
          </p>
        </div>

        {incomeNum > 0 && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-slate-800/60 border border-teal-100 dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Ingreso libre después de gastos esenciales:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(remainingIncome)}</span>
            </div>
            <div className="flex justify-between text-teal-800 dark:text-cyan-300 font-bold">
              <span>Destinado a deudas:</span>
              <span>{formatCurrency(availableNum)}</span>
            </div>
          </div>
        )}

        <div className="pt-3">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 px-6 rounded-xl font-bold text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isSaving ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </div>
      </form>
    </div>
  );
};
