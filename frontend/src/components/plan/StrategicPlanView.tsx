import React, { useState, useEffect } from 'react';
import { 
  Snowflake, 
  Flame, 
  CheckCircle2, 
  TrendingDown, 
  Calendar, 
  FileDown, 
  ArrowRight, 
  Sparkles, 
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { simulationService } from '../../services/simulationService';
import { strategyService } from '../../services/strategyService';

export const StrategicPlanView: React.FC = () => {
  const { 
    debts, 
    activeStrategy, 
    setActiveStrategy, 
    formatCurrency, 
    formatNumber,
    navigateToDebtDetail,
    setIsExportReportOpen,
    setCurrentScreen
  } = useApp();

  const [strategyStats, setStrategyStats] = useState<{
    snowball: { totalInterest: number; payoffDate: string; months: number };
    avalanche: { totalInterest: number; payoffDate: string; months: number; savingsVsSnowball: number };
  }>({
    snowball: { totalInterest: 0, payoffDate: 'Calculando...', months: 0 },
    avalanche: { totalInterest: 0, payoffDate: 'Calculando...', months: 0, savingsVsSnowball: 0 }
  });
  const [orderedDebtIds, setOrderedDebtIds] = useState<string[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      if (debts.length > 0) {
        const comparison = await strategyService.getComparison(activeStrategy);
        setStrategyStats({ snowball: comparison.snowball, avalanche: comparison.avalanche });
        setOrderedDebtIds(comparison.orderedDebtIds);
      }
    };
    loadStats();
  }, [debts, activeStrategy]);

  // Sort according to current active strategy
  const prioritizedDebts = orderedDebtIds.length > 0
    ? orderedDebtIds.map((id) => debts.find((debt) => debt.id === id)).filter((debt): debt is NonNullable<typeof debt> => Boolean(debt))
    : simulationService.sortDebtsByStrategy(debts, activeStrategy);

  if (debts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
        <Info className="w-11 h-11 mx-auto text-slate-400" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Aún no hay deudas para ordenar</h1>
        <p className="mt-2 text-sm text-slate-500">Registra una obligación para aplicar Bola de Nieve o Avalancha.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Estrategia de Pago
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compara y selecciona el método óptimo para liquidar tus obligaciones financieras.
          </p>
        </div>

        <button
          id="export-pdf-plan-btn"
          onClick={() => setIsExportReportOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <FileDown className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
          <span>Exportar PDF</span>
        </button>
      </div>

      {/* Strategy Selector (Page 7 & 19 of PDF) */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Estrategia Activa
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Card 1: Bola de Nieve */}
          <div
            id="strategy-snowball-card"
            onClick={() => setActiveStrategy('snowball')}
            className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeStrategy === 'snowball'
                ? 'bg-gradient-to-br from-white to-cyan-50/40 dark:from-slate-900 dark:to-teal-950/40 border-[#008FA6] dark:border-cyan-400 shadow-sm ring-4 ring-[#008FA6]/10'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${activeStrategy === 'snowball' ? 'bg-[#008FA6] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Bola de Nieve
                    </h3>
                    <span className="text-xs text-[#008FA6] dark:text-cyan-400 font-semibold">
                      Prioriza saldos menores
                    </span>
                  </div>
                </div>

                {activeStrategy === 'snowball' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#008FA6] text-white">
                    ACTIVA
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Enfócate en pagar primero las deudas más pequeñas independientemente de la tasa de interés. Esto genera victorias rápidas y motivación psicológica para mantener el plan a largo plazo.
              </p>
            </div>

            {/* Metrics Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Intereses Estimados</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatCurrency(strategyStats.snowball.totalInterest)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Fecha de Finalización</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {strategyStats.snowball.payoffDate}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Avalancha */}
          <div
            id="strategy-avalanche-card"
            onClick={() => setActiveStrategy('avalanche')}
            className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              activeStrategy === 'avalanche'
                ? 'bg-gradient-to-br from-white to-cyan-50/40 dark:from-slate-900 dark:to-teal-950/40 border-[#008FA6] dark:border-cyan-400 shadow-sm ring-4 ring-[#008FA6]/10'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${activeStrategy === 'avalanche' ? 'bg-[#008FA6] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Avalancha
                    </h3>
                    <span className="text-xs text-[#008FA6] dark:text-cyan-400 font-semibold">
                      Prioriza tasas de interés altas
                    </span>
                  </div>
                </div>

                {activeStrategy === 'avalanche' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#008FA6] text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ACTIVA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200">
                    Recomendada
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Matemáticamente la ruta más eficiente. Enfoca el capital extra en las deudas con mayor costo financiero (TAE/EA), minimizando el dinero perdido en intereses.
              </p>
            </div>

            {/* Metrics Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Intereses Estimados</span>
                <span className="font-bold text-[#008FA6] dark:text-cyan-300">
                  {formatCurrency(strategyStats.avalanche.totalInterest)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Ahorro vs Bola de Nieve</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(strategyStats.avalanche.savingsVsSnowball)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Fecha de Finalización</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {strategyStats.avalanche.payoffDate}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Prioritized Roadmap Section (Page 7 & 19 of PDF) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Hoja de Ruta: {activeStrategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Orden de liquidación optimizado matemáticamente para tu cartera
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {prioritizedDebts.length} Deudas en lista
          </span>
        </div>

        {/* List of Prioritized Items */}
        <div className="space-y-4">
          {prioritizedDebts.map((debt, index) => {
            const priorityNumber = index + 1;
            const isFocus = priorityNumber === 1;

            const paidPct = debt.originalAmount > 0 
              ? Math.min(100, Math.round(((debt.originalAmount - debt.currentBalance) / debt.originalAmount) * 100))
              : 0;

            return (
              <div
                key={debt.id}
                onClick={() => navigateToDebtDetail(debt.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isFocus
                    ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-700/60 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-850/60 border-slate-200/70 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Priority tag + Name + Action note */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase ${
                        isFocus 
                          ? 'bg-[#008FA6] text-white' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        PRIORIDAD {priorityNumber}
                      </span>
                      
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {debt.name}
                      </h3>

                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {debt.interestRate}% {debt.rateType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFocus ? (
                        <span>
                          <strong className="text-slate-900 dark:text-white">Foco Principal Actual.</strong> Asignando cuota mensual ({formatCurrency(debt.monthlyPayment)}) + $150.000 COP extra.
                        </span>
                      ) : (
                        <span>
                          Pago mínimo hasta liquidar la prioridad {priorityNumber - 1}. Proyección: Inicio en fase {priorityNumber}.
                        </span>
                      )}
                    </p>

                    {/* Progress */}
                    <div className="max-w-md pt-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                        <span>Progreso ({paidPct}%)</span>
                        <span>Saldo: {formatCurrency(debt.currentBalance)}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-cyan-600 h-full rounded-full"
                          style={{ width: `${Math.max(5, paidPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Payment suggested & Payoff Projection */}
                  <div className="text-left lg:text-right flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      {isFocus ? 'Pago sugerido mensual' : 'Pago mínimo'}
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(isFocus ? debt.monthlyPayment + 150000 : debt.minimumPayment)}
                    </span>
                    <span className="text-xs text-teal-700 dark:text-cyan-400 font-semibold block mt-0.5">
                      Proyección: {isFocus ? 'Pagado en ~6 meses' : `Inicio en ${2024 + index}`}
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
