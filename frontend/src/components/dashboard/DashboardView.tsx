import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  TrendingUp, 
  Calendar, 
  ArrowRight, 
  Plus, 
  Sliders, 
  CreditCard, 
  Landmark, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Zap,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { simulationService } from '../../services/simulationService';

export const DashboardView: React.FC = () => {
  const { 
    userProfile, 
    financialProfile, 
    debts, 
    totalDebt, 
    totalPaidSoFar, 
    totalOriginalDebt, 
    overallProgressPercentage, 
    formatCurrency, 
    formatNumber,
    setCurrentScreen, 
    navigateToDebtDetail, 
    openRecordPaymentModal, 
    setIsAddDebtOpen,
    setIsEditFinancialOpen,
    activeStrategy
  } = useApp();

  const [hideBalances, setHideBalances] = useState(false);

  // Find upcoming due commitments
  const sortedByDue = [...debts].sort((a, b) => a.dueDateDay - b.dueDateDay);
  const prioritizedDebts = simulationService.sortDebtsByStrategy(debts, activeStrategy);
  const topPriorityDebt = prioritizedDebts[0];

  const maskValue = (formatted: string) => {
    return hideBalances ? '••••••••' : formatted;
  };

  if (debts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
        <Landmark className="w-12 h-12 text-slate-300 mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">Empieza registrando tu primera deuda</h1>
        <p className="mt-2 text-sm text-slate-500">Inicio mostrará tu resumen real cuando exista al menos una obligación registrada.</p>
        <button onClick={() => setIsAddDebtOpen(true)} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#008FA6] text-white rounded-xl text-sm font-bold"><Plus className="w-4 h-4" />Agregar deuda</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hola, {userProfile.fullName.split(' ')[0] || 'Mateo'}.
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Aquí está el resumen de tu camino hacia cero deudas.
          </p>
        </div>

        {/* Global Privacy Eye Toggle */}
        <button
          onClick={() => setHideBalances(!hideBalances)}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          {hideBalances ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-teal-600" />}
          <span>{hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}</span>
        </button>
      </div>

      {financialProfile.incompleteCoverage && (
        <div role="note" className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">Los resultados se calculan únicamente con las {financialProfile.registeredDebts} deudas registradas y pueden representar parcialmente tu situación financiera. Declaraste {financialProfile.totalDeclaredDebts}.</p>
        </div>
      )}

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Deuda Total Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-teal-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Deuda Total
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-cyan-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {maskValue(formatCurrency(totalDebt))}
            </div>
            <div className="flex items-center justify-between text-xs mt-3 text-slate-500 dark:text-slate-400 font-medium">
              <span>Progreso general</span>
              <span className="font-bold text-teal-700 dark:text-cyan-400">{overallProgressPercentage}% Pagado</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-600 to-cyan-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.max(5, overallProgressPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Pagado */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Total Pagado
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {maskValue(formatCurrency(totalPaidSoFar))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              De ${formatNumber(totalOriginalDebt)} valor original acumulado
            </p>
          </div>
        </div>

        {/* Saldo Pendiente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Saldo Pendiente
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {maskValue(formatCurrency(totalDebt))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Distribuido en {debts.length} compromisos activos
            </p>
          </div>
        </div>

        {/* Capacidad de Pago Card */}
        <div className="bg-gradient-to-br from-teal-50/70 to-cyan-50/70 dark:from-slate-800 dark:to-slate-850 border border-teal-200/60 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-teal-800 dark:text-cyan-300 uppercase">
              Capacidad de Pago
            </span>
            <button
              onClick={() => setIsEditFinancialOpen(true)}
              className="p-1 rounded-lg text-teal-700 dark:text-cyan-300 hover:bg-teal-100 dark:hover:bg-slate-700"
              title="Ajustar"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-extrabold text-teal-900 dark:text-white tracking-tight">
              {maskValue(formatCurrency(financialProfile.paymentCapacity))} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ mes</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Basado en ingresos de {formatCurrency(financialProfile.monthlyIncome)}
            </p>
            <button
              id="dashboard-ajustar-capacidad-btn"
              onClick={() => setIsEditFinancialOpen(true)}
              className="mt-2 text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Ajustar Capacidad &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* Row 2: "Tu próximo paso" Hero Action Card + Financial Progress Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Tu Próximo Paso Card (Page 3 of PDF) */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Tu próximo paso
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-cyan-300">
                Recomendado
              </span>
            </div>

            <div className="p-4 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-600 text-white shadow-2xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Pagar {topPriorityDebt?.name || 'Tarjeta Visa Platinum'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Hacer un pago extra de <strong className="text-slate-900 dark:text-white">$500.000 COP</strong> este mes te ahorrará aproximadamente <strong className="text-teal-700 dark:text-cyan-400">$340.000 en intereses</strong>.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-2">
            <button
              id="dashboard-pago-extra-btn"
              onClick={() => openRecordPaymentModal(topPriorityDebt?.id)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#008FA6] hover:bg-[#007A8E] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <span>Registrar Pago Extra</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progreso Financiero & Reducción Proyectada (Page 20 of PDF) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Progreso financiero
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {overallProgressPercentage}% pagado de la deuda total consolidada
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
              <span>Meta estimada:</span>
              <strong className="text-teal-700 dark:text-cyan-400">Pendiente de cálculo del backend</strong>
            </div>
          </div>

          {/* Large Progress Bar with Markers */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>$0</span>
              <span>{overallProgressPercentage}%</span>
              <span>${formatNumber(totalOriginalDebt)}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div 
                className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-xs"
                style={{ width: `${Math.max(8, overallProgressPercentage)}%` }}
              />
            </div>
          </div>

          {/* Curve / Graphic Area */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tendencia de reducción proyectada
              </span>
              <button
                onClick={() => setCurrentScreen('simulation')}
                className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Abrir Simulador &rarr;
              </button>
            </div>

            {/* Visual Amortization Wave Simulation */}
            <div className="h-20 w-full rounded-xl bg-slate-50 dark:bg-slate-850/60 p-2 flex items-end justify-between gap-2 overflow-hidden relative">
              <div className="absolute inset-x-0 bottom-3 h-[1px] bg-slate-200 dark:bg-slate-700" />
              
              {/* Simulated timeline bars */}
              {[
                { m: 'Hoy', actual: 100, sim: 90 },
                { m: 'Mes 3', actual: 88, sim: 70 },
                { m: 'Mes 6', actual: 75, sim: 52 },
                { m: 'Mes 9', actual: 64, sim: 35 },
                { m: 'Mes 12', actual: 52, sim: 18 },
                { m: 'Mes 18', actual: 30, sim: 0 },
                { m: 'Mes 24', actual: 12, sim: 0 },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 z-10">
                  <div className="w-full flex items-end justify-center gap-1 h-12">
                    <div 
                      className="w-2 sm:w-3 bg-slate-300 dark:bg-slate-600 rounded-t-sm transition-all"
                      style={{ height: `${item.actual}%` }}
                      title={`Actual: ${item.actual}%`}
                    />
                    <div 
                      className="w-2 sm:w-3 bg-cyan-600 rounded-t-sm transition-all shadow-xs"
                      style={{ height: `${item.sim}%` }}
                      title={`Con Acelerador: ${item.sim}%`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium truncate">
                    {item.m}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Row 3: Próximos Vencimientos + Deuda Prioritaria + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Próximos Vencimientos (Page 3 & 20) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Próximos vencimientos
              </h2>
            </div>
            <button
              onClick={() => setCurrentScreen('calendar')}
              className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-2.5">
            {sortedByDue.slice(0, 3).map((d) => {
              const isUrgent = d.status === 'vence_hoy' || d.dueDateDay === 15;

              return (
                <div 
                  key={d.id}
                  onClick={() => navigateToDebtDetail(d.id)}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-200 dark:hover:border-teal-900 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${isUrgent ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-cyan-400'}`}>
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-cyan-400 transition-colors">
                        {d.name}
                      </h4>
                      <span className={`text-[11px] font-semibold ${isUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {isUrgent ? '• Vence hoy' : `En ${Math.abs(d.dueDateDay - 12)} días`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {maskValue(formatCurrency(d.monthlyPayment || d.minimumPayment))}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {d.type === 'credit_card' ? 'Pago mínimo' : 'Cuota fija'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deuda Prioritaria Card (Page 20) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Deuda prioritaria
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 border border-teal-200/60 dark:border-teal-800">
                {activeStrategy === 'snowball' ? 'BOLA DE NIEVE' : 'AVALANCHA'}
              </span>
            </div>

            {topPriorityDebt ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/40 dark:from-slate-850 dark:to-teal-950/20 border border-teal-100/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {topPriorityDebt.name}
                    </h3>
                  </div>
                  <span className="text-xs font-extrabold text-teal-800 dark:text-cyan-300">
                    {topPriorityDebt.interestRate}% {topPriorityDebt.rateType}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeStrategy === 'snowball'
                    ? 'Menor saldo actual. Enfoca tus abonos extras aquí para liquidarla primero y ganar impulso.'
                    : 'Tasa de interés más alta. Enfoca tus pagos extra aquí para minimizar el costo financiero.'}
                </p>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Saldo actual:</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {maskValue(formatCurrency(topPriorityDebt.currentBalance))}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setCurrentScreen('strategy')}
            className="mt-4 w-full py-2.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 text-center transition-colors"
          >
            Ver Estrategia de Pago completa &rarr;
          </button>
        </div>

        {/* Acciones Rápidas (Page 20) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Acciones rápidas
            </h2>
            <div className="space-y-2">
              <button
                id="quick-ajustar-plan-btn"
                onClick={() => setCurrentScreen('strategy')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50/50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-transparent hover:border-teal-200/60"
              >
                <span>Ajustar estrategia de pago</span>
                <ChevronRightIcon />
              </button>

              <button
                id="quick-registrar-pago-btn"
                onClick={() => openRecordPaymentModal()}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50/50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-transparent hover:border-teal-200/60"
              >
                <span>Registrar pago realizado</span>
                <ChevronRightIcon />
              </button>

              <button
                id="quick-simular-pago-btn"
                onClick={() => setCurrentScreen('simulation')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50/50 dark:hover:bg-slate-750 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-transparent hover:border-teal-200/60"
              >
                <span>Simular abono adicional</span>
                <ChevronRightIcon />
              </button>
            </div>
          </div>

          <button
            id="quick-add-debt-btn"
            onClick={() => setIsAddDebtOpen(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#008FA6] hover:bg-[#007A8E] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar nueva deuda</span>
          </button>
        </div>

      </div>

      {/* Row 4: Mis Deudas Table Overview (Page 3 of PDF) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Mis deudas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vista previa de compromisos vigentes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddDebtOpen(true)}
              className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 hover:bg-teal-100"
              title="Agregar deuda"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentScreen('debts')}
              className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline ml-1"
            >
              Ver todas ({debts.length})
            </button>
          </div>
        </div>

        {/* Table / Card List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="pb-3 font-semibold">Nombre</th>
                <th className="pb-3 font-semibold">Tasa (CAT/EA)</th>
                <th className="pb-3 font-semibold text-right">Saldo Actual</th>
                <th className="pb-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {debts.map((debt) => (
                <tr 
                  key={debt.id} 
                  onClick={() => navigateToDebtDetail(debt.id)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-850/60 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0">
                        {debt.type === 'credit_card' ? <CreditCard className="w-3.5 h-3.5" /> : <Landmark className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {debt.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {debt.entity}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-bold text-slate-700 dark:text-slate-300">
                    {debt.interestRate}% <span className="text-[10px] font-normal text-slate-400">({debt.rateType})</span>
                  </td>
                  <td className="py-3.5 font-extrabold text-slate-900 dark:text-white text-right">
                    {maskValue(formatCurrency(debt.currentBalance))}
                  </td>
                  <td className="py-3.5 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToDebtDetail(debt.id);
                      }}
                      className="text-teal-700 dark:text-cyan-400 font-bold hover:underline"
                    >
                      Detalles &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

const ChevronRightIcon = () => (
  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);
