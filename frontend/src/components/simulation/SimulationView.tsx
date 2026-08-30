import React from 'react';
import { 
  Zap, 
  Minus, 
  Plus, 
  Info, 
  TrendingDown, 
  Clock, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSimulation } from './useSimulation';

export const SimulationView: React.FC = () => {
  const { 
    debts, 
    formatCurrency, 
    formatNumber,
    activeStrategy,
    showToast,
    userProfile,
    setCurrentScreen
  } = useApp();
  const {
    params: simulationParams,
    setParams: setSimulationParams,
    result: simulationResult,
    isCalculating,
    error: simulationError,
    calculate: runSimulationCalculation
  } = useSimulation(debts, activeStrategy, userProfile.plan === 'plus');

  if (userProfile.plan === 'cero') {
    return (
      <div className="max-w-2xl mx-auto py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
        <Sparkles className="w-12 h-12 mx-auto text-[var(--ceroa-primary)]" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">Simular está disponible con Ceroa Plus</h1>
        <p className="mt-2 text-sm text-slate-500">Puedes entrar a esta sección con Plan Cero, pero ejecutar escenarios hipotéticos es una función exclusiva de Plus.</p>
        <button onClick={() => setCurrentScreen('subscription')} className="mt-6 px-5 py-2.5 bg-[var(--ceroa-primary)] text-white rounded-xl text-sm font-bold">Conocer Ceroa Plus</button>
      </div>
    );
  }

  if (debts.length === 0 || !simulationResult) {
    return (
      <div className="max-w-2xl mx-auto py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
        <Info className="w-11 h-11 mx-auto text-slate-400" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Datos insuficientes para simular</h1>
        <p className="mt-2 text-sm text-slate-500">Registra al menos una deuda para preparar un escenario. Ningún valor ficticio será mostrado.</p>
      </div>
    );
  }

  const handleLumpSumStep = (delta: number) => {
    setSimulationParams((prev) => ({
      ...prev,
      lumpSumExtra: Math.max(0, prev.lumpSumExtra + delta)
    }));
  };

  const handleMonthlyStep = (delta: number) => {
    setSimulationParams((prev) => ({
      ...prev,
      monthlyIncrease: Math.max(0, prev.monthlyIncrease + delta)
    }));
  };

  const handleRecalculate = async () => {
    const succeeded = await runSimulationCalculation();
    showToast(succeeded
      ? '¡Escenario recalculado con éxito!'
      : simulationError || 'No fue posible recalcular el escenario');
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-cyan-100 dark:bg-cyan-950 text-teal-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Modo Simulación</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Proyecta tu libertad
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Descubre cómo pequeños abonos adicionales o un aumento en tu cuota mensual pueden reducir drásticamente el tiempo y los intereses de tus deudas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Configuration Controls (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              Ajustes del escenario
            </h2>
            <span className="text-[11px] font-semibold text-teal-700 dark:text-cyan-400">
              Estrategia: {activeStrategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'}
            </span>
          </div>

          {/* Debt selector */}
          <div className="space-y-1.5">
            <label htmlFor="simulation-debt-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Selecciona la deuda
            </label>
            <select
              id="simulation-debt-select"
              value={simulationParams.selectedDebtId}
              onChange={(e) => setSimulationParams((prev) => ({ ...prev, selectedDebtId: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Todas las deudas (Portafolio Consolidado)</option>
              {debts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.entity}) - ${formatNumber(d.currentBalance)}
                </option>
              ))}
            </select>
          </div>

          {/* Stepper 1: Abono adicional único */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Abono adicional (Única vez hoy)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="lump-sum-minus-btn"
                onClick={() => handleLumpSumStep(-100000)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <div className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  ${formatNumber(simulationParams.lumpSumExtra)}
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">COP único</span>
              </div>

              <button
                type="button"
                id="lump-sum-plus-btn"
                onClick={() => handleLumpSumStep(100000)}
                className="w-10 h-10 rounded-xl bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stepper 2: Aumento del pago mensual */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Aumento del pago mensual continuo
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="monthly-inc-minus-btn"
                onClick={() => handleMonthlyStep(-20000)}
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <div className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                <span className="text-base font-extrabold text-[var(--ceroa-primary)] dark:text-cyan-300">
                  +${formatNumber(simulationParams.monthlyIncrease)}
                </span>
                <span className="text-[10px] text-slate-400 block -mt-0.5">COP / mes</span>
              </div>

              <button
                type="button"
                id="monthly-inc-plus-btn"
                onClick={() => handleMonthlyStep(20000)}
                className="w-10 h-10 rounded-xl bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white flex items-center justify-center font-bold text-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recalculate Button */}
          <button
            id="simulation-recalculate-btn"
            onClick={handleRecalculate}
            disabled={isCalculating}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCalculating ? 'Calculando...' : 'Recalcular Escenario'}</span>
          </button>

          {/* Legal / Mathematical Disclaimer */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Los resultados de esta simulación son una estimación basada en las tasas de interés actuales. No constituyen una promesa financiera exacta.
            </p>
          </div>

        </div>

        {/* Right Column: Dynamic Results & Visual Charts (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Result Highlights Grid (Page 8 & 17 of PDF) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Intereses Ahorrados Card */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50/60 dark:from-slate-900 dark:to-teal-950/40 border border-teal-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-cyan-300">
                  Intereses Ahorrados
                </span>
                <div className="text-3xl font-extrabold text-teal-900 dark:text-cyan-300 mt-2">
                  {formatCurrency(simulationResult.savedInterest)}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-800 text-white">
                  <TrendingDown className="w-3.5 h-3.5" />
                  -{simulationResult.reductionPercentage}% en costos
                </div>
              </div>

              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 block">
                Capital directo a tu bolsillo que no pagarás a los bancos.
              </span>
            </div>

            {/* Nueva Fecha Estimada Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Nueva Fecha Estimada
                </span>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {simulationResult.newPayoffDate}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  <Clock className="w-3.5 h-3.5" />
                  {simulationResult.savedMonths} meses antes
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400 mt-3">
                <span>Escenario actual:</span>
                <strong className="text-slate-700 dark:text-slate-300">{simulationResult.originalPayoffDate}</strong>
              </div>
            </div>

          </div>

          {/* Proyección de Pagos Totales (Page 17 of PDF) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Proyección de Pagos Totales
              </h3>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  Actual
                </span>
                <span className="flex items-center gap-1.5 text-teal-700 dark:text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span>
                  Simulado
                </span>
              </div>
            </div>

            {/* Bar 1: Escenario Actual */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Escenario Actual ({simulationResult.originalPayoffDate})</span>
                <strong className="text-slate-900 dark:text-white">${formatNumber(simulationResult.originalTotalCost)} Total</strong>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-xl flex overflow-hidden p-0.5">
                <div className="bg-slate-400 dark:bg-slate-600 h-full rounded-l-lg flex items-center px-2 text-[10px] text-white font-bold" style={{ width: '75%' }}>
                  Capital
                </div>
                <div className="bg-rose-400 h-full rounded-r-lg flex items-center px-2 text-[10px] text-white font-bold" style={{ width: '25%' }}>
                  Interés
                </div>
              </div>
            </div>

            {/* Bar 2: Escenario Simulado */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs">
                <span className="text-teal-700 dark:text-cyan-400 font-bold">Escenario Simulado ({simulationResult.newPayoffDate})</span>
                <strong className="text-teal-900 dark:text-cyan-300 font-extrabold">${formatNumber(simulationResult.simulatedTotalCost)} Total</strong>
              </div>
              <div className="w-full bg-teal-50 dark:bg-slate-800 h-6 rounded-xl flex overflow-hidden p-0.5 border border-teal-200 dark:border-teal-900">
                <div className="bg-cyan-600 h-full rounded-l-lg flex items-center px-2 text-[10px] text-white font-bold" style={{ width: '88%' }}>
                  Capital
                </div>
                <div className="bg-emerald-400 h-full rounded-r-lg flex items-center px-2 text-[10px] text-slate-900 font-bold" style={{ width: '12%' }}>
                  Menos Interés
                </div>
              </div>
            </div>
          </div>

          {/* Evolución de la Deuda Curve (Page 8 of PDF) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Evolución de la deuda
              </h3>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400"></span>
                  Actual
                </span>
                <span className="flex items-center gap-1.5 text-cyan-600">
                  <span className="w-3 h-0.5 bg-cyan-600"></span>
                  Simulación
                </span>
              </div>
            </div>

            {/* Custom SVG Curve Graph */}
            <div className="relative h-44 w-full pt-4">
              <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="simGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#088395" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#088395" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="140" x2="500" y2="140" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" strokeDasharray="3 3" />

                {/* Actual Baseline Curve (Dashed gray) */}
                <path
                  d="M 20 20 Q 250 50 480 140"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />

                {/* Sim Area & Curve (Solid Cyan-Teal) */}
                <path
                  d="M 20 20 Q 200 45 350 140 L 350 140 L 20 140 Z"
                  fill="url(#simGradient)"
                />
                <path
                  d="M 20 20 Q 200 45 350 140"
                  fill="none"
                  stroke="#088395"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Target Dot Milestone */}
                <circle cx="350" cy="140" r="5" fill="#088395" />
                <circle cx="480" cy="140" r="4" fill="#94a3b8" />
              </svg>

              {/* Labels below */}
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-2 mt-1">
                <span>Hoy</span>
                <span className="text-teal-700 dark:text-cyan-400 font-bold">
                  {simulationResult.newPayoffDate} (Meta)
                </span>
                <span>{simulationResult.originalPayoffDate}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
