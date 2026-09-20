import React from 'react';
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
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDashboardOverview } from './useDashboardOverview';

export const DashboardView: React.FC = () => {
  const {
    userProfile,
    debts,
    payments,
    dashboardSummary,
    isDashboardLoading,
    dashboardError,
    refreshDashboard,
    formatCurrency,
    formatDate,
    setCurrentScreen,
    navigateToDebtDetail,
    openRecordPaymentModal,
    openAddDebtModal,
    setIsEditFinancialOpen,
    activeStrategy
  } = useApp();

  const { hideBalances, setHideBalances, maskValue } =
    useDashboardOverview(debts, payments, activeStrategy);

  // 1. Estado de Carga (CA-07 & CA-08: no mostrar cifras ficticias ni $0)
  if (isDashboardLoading && !dashboardSummary) {
    return (
      <div
        role="status"
        aria-label="Cargando resumen financiero"
        className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto animate-pulse"
      >
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-5" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Estado de Error (CA-08: no usar placeholders ficticios)
  if (dashboardError && !dashboardSummary) {
    return (
      <div
        role="alert"
        className="max-w-2xl mx-auto py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-8 shadow-xs"
      >
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
          No fue posible obtener la información financiera
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {dashboardError}
        </p>
        <button
          onClick={() => void refreshDashboard()}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar consulta
        </button>
      </div>
    );
  }

  // 3. Estado Vacío (CA-07: sin deudas registradas)
  if (!dashboardSummary || dashboardSummary.status === 'EMPTY' || dashboardSummary.registeredDebtCount === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
        <Landmark className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
          Empieza registrando tu primera deuda
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Inicio mostrará tu resumen real cuando exista al menos una obligación registrada.
        </p>
        <button
          id="dashboard-empty-add-debt-btn"
          onClick={openAddDebtModal}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar nueva deuda
        </button>
      </div>
    );
  }

  const {
    totalRegisteredDebt,
    activeDebtCount,
    requiredPaymentsCurrentPeriod,
    hasRequiredPaymentsData,
    nextDue,
    upcomingDues,
    availableForDebt,
    activeStrategy: summaryStrategy,
    progress,
    estimatedDebtFreeDate,
    hasEstimatedDebtFreeDate,
    totalDeclaredDebts,
    registeredDebtCount,
    partialCoverage
  } = dashboardSummary;

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">

      {/* Header Greeting */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hola, {userProfile.fullName.split(' ')[0] || 'bienvenido'}.
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Resumen financiero consolidado de tu camino hacia cero deudas.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => void refreshDashboard()}
            aria-label="Actualizar resumen"
            title="Actualizar datos del servidor"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isDashboardLoading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            onClick={() => setHideBalances(!hideBalances)}
            aria-label={hideBalances ? 'Mostrar saldos financieros' : 'Ocultar saldos financieros'}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            {hideBalances ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-teal-600" />}
            <span>{hideBalances ? 'Mostrar saldos' : 'Ocultar saldos'}</span>
          </button>
        </div>
      </header>

      {/* HU-038: Advertencia visible de Cobertura Parcial (CA-01, CA-02, CA-04) */}
      {partialCoverage && (
        <section
          role="note"
          aria-label="Advertencia de cobertura parcial"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                Cobertura parcial ({registeredDebtCount} de {totalDeclaredDebts} deudas registradas)
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Declaraste {totalDeclaredDebts} deudas en tu configuración, pero actualmente tienes {registeredDebtCount} registradas. La deuda total, cuotas del periodo, progreso, estrategia de pago y proyecciones se basan únicamente en las obligaciones efectivamente registradas.
              </p>
            </div>
          </div>
          <button
            onClick={openAddDebtModal}
            className="self-start sm:self-center flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar deuda faltante</span>
          </button>
        </section>
      )}

      {/* TT-037.1 & CA-01, CA-02: Grid de Indicadores Principales */}
      <section aria-label="Indicadores financieros principales">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

          {/* 1. Deuda Total Registrada (CA-01) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-teal-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Deuda Total Registrada
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-cyan-400 flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {maskValue(formatCurrency(totalRegisteredDebt))}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Suma de saldos de {registeredDebtCount} {registeredDebtCount === 1 ? 'deuda registrada' : 'deudas registradas'}
              </p>
            </div>
          </div>

          {/* 2. Obligaciones Activas (CA-01) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Obligaciones Activas
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {activeDebtCount}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {activeDebtCount === 0 ? '¡Estás al día sin deudas pendientes!' : `${activeDebtCount} con saldo pendiente por liquidar`}
              </p>
            </div>
          </div>

          {/* 3. Pagos / Cuotas del Periodo (CA-01 & CA-07 / CA-08) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Cuotas del Periodo
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              {hasRequiredPaymentsData && requiredPaymentsCurrentPeriod !== null ? (
                <>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {maskValue(formatCurrency(requiredPaymentsCurrentPeriod))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Total requerido de cuotas y pagos mínimos
                  </p>
                </>
              ) : (
                <>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    Datos insuficientes
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Sin cuotas fijas o periódicas definidas en el sistema
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 4. Próximo Vencimiento (CA-01 & CA-03) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                Próximo Vencimiento
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              {nextDue ? (
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate" title={nextDue.debtName}>
                    {nextDue.debtName}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {formatDate(nextDue.dueDate)} ({nextDue.daysUntilDue} d)
                    </span>
                    <span className="font-bold text-teal-700 dark:text-cyan-400">
                      {maskValue(formatCurrency(nextDue.amount))}
                    </span>
                  </div>
                  {/* Hitos aprobados 7, 3 y 0 días (HU-048 CA-03) */}
                  {nextDue.daysUntilDue === 7 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800" data-testid="dashboard-milestone-7">
                      <Clock className="w-3 h-3" />
                      <span>Hito: 7 días antes</span>
                    </div>
                  )}
                  {nextDue.daysUntilDue === 3 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800" data-testid="dashboard-milestone-3">
                      <Clock className="w-3 h-3" />
                      <span>Hito: 3 días antes</span>
                    </div>
                  )}
                  {nextDue.daysUntilDue === 0 && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800" data-testid="dashboard-milestone-0">
                      <AlertCircle className="w-3 h-3" />
                      <span>Hito: Vence hoy</span>
                    </div>
                  )}
                  <div>
                    <button
                      onClick={() => navigateToDebtDetail(nextDue.debtId)}
                      className="mt-2 text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Ver detalle de la deuda &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Sin vencimientos próximos
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    No hay fechas límite registradas pendientes
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Row 2: Proyecciones, Estrategia y Capacidad (CA-02) */}
      <section aria-label="Estrategia y proyecciones financieras" className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5">

        {/* 5. Dinero Disponible para Deudas (CA-02) */}
        <div className="bg-gradient-to-br from-teal-50/60 to-cyan-50/60 dark:from-slate-800 dark:to-slate-800 border border-teal-200/60 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-teal-800 dark:text-cyan-300 uppercase">
              Dinero Disponible
            </span>
            <button
              onClick={() => setIsEditFinancialOpen(true)}
              aria-label="Ajustar capacidad financiera"
              className="p-1 rounded-lg text-teal-700 dark:text-cyan-300 hover:bg-teal-100 dark:hover:bg-slate-700 transition-colors"
              title="Ajustar dinero disponible"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-950 dark:text-white tracking-tight">
              {maskValue(formatCurrency(availableForDebt))} <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ mes</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Capacidad configurada para pago de obligaciones
            </p>
            <button
              id="dashboard-ajustar-disponible-btn"
              onClick={() => setIsEditFinancialOpen(true)}
              className="mt-3 text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Ajustar en perfil &rarr;
            </button>
          </div>
        </div>

        {/* 6. Estrategia Activa (CA-02) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Estrategia de Pago
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 border border-teal-200/60 dark:border-teal-800">
              {summaryStrategy === 'snowball' ? 'BOLA DE NIEVE' : 'AVALANCHA'}
            </span>
          </div>

          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {summaryStrategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {summaryStrategy === 'snowball'
                ? 'Liquida primero la obligación de menor saldo actual para ganar impulso rápido.'
                : 'Liquida primero la obligación de mayor tasa de interés para maximizar el ahorro.'}
            </p>
            <button
              onClick={() => setCurrentScreen('strategy')}
              className="mt-3 text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              Explorar estrategia &rarr;
            </button>
          </div>
        </div>

        {/* 7. Progreso General (CA-02 & CA-07 / CA-08) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Progreso General
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            {progress.hasProgressData && progress.percentage !== null ? (
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {progress.percentage}% Pagado
                </div>
                {/* Progress bar accessible */}
                <div
                  role="progressbar"
                  aria-valuenow={progress.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-2 overflow-hidden"
                >
                  <div
                    className="bg-gradient-to-r from-teal-600 to-cyan-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Reducido: {maskValue(formatCurrency(progress.totalPaidSoFar || 0))} de {maskValue(formatCurrency(progress.totalOriginalDebt || 0))}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  Datos insuficientes
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Se requiere registrar montos originales de deudas para calcular el porcentaje de avance
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 8. Fecha Estimada Libre de Deudas (CA-02 & CA-07 / CA-08) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              Cero Deudas Estimado
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-3">
            {hasEstimatedDebtFreeDate && estimatedDebtFreeDate ? (
              <div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {estimatedDebtFreeDate}
                </div>
                <span className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                  Proyección estimada (no contractual)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Calculada según tu dinero disponible y estrategia activa
                </p>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                  Datos insuficientes
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ajusta tu dinero disponible o las cuotas periódicas para proyectar la fecha de liquidación
                </p>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* Row 3: Próximos Vencimientos Contextuales + Acciones Rápidas (CA-03, TT-037.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Próximos Vencimientos con Navegación Contextual hacia Deudas */}
        <section aria-label="Listado de próximos vencimientos" className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Próximos vencimientos
              </h2>
            </div>
            <button
              onClick={() => setCurrentScreen('calendar')}
              className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Ver calendario completo &rarr;
            </button>
          </div>

          {upcomingDues.length > 0 ? (
            <div className="space-y-2.5">
              {upcomingDues.map((due) => (
                <div
                  key={due.debtId}
                  onClick={() => navigateToDebtDetail(due.debtId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateToDebtDetail(due.debtId); }}
                  aria-label={`Ver detalle de la deuda ${due.debtName}`}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-cyan-400">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-cyan-400 transition-colors">
                          {due.debtName}
                        </h3>
                        {due.daysUntilDue === 7 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Clock className="w-2.5 h-2.5" />
                            Hito 7d
                          </span>
                        )}
                        {due.daysUntilDue === 3 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-2.5 h-2.5" />
                            Hito 3d
                          </span>
                        )}
                        {due.daysUntilDue === 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Vence hoy
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {due.entity || 'Entidad no especificada'} • Vence el {formatDate(due.dueDate)} ({due.daysUntilDue} {due.daysUntilDue === 1 ? 'día' : 'días'})
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {maskValue(formatCurrency(due.amount))}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Cuota exigible
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No hay vencimientos programados en tus obligaciones activas.
              </p>
            </div>
          )}
        </section>

        {/* Acciones Rápidas del Panel */}
        <section aria-label="Acciones rápidas" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Acciones del panel
            </h2>
            <div className="space-y-2">
              <button
                id="quick-nav-debts-btn"
                onClick={() => setCurrentScreen('debts')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50/50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-transparent hover:border-teal-200/60"
              >
                <span>Ver todas mis obligaciones ({debts.length})</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                id="quick-ajustar-estrategia-btn"
                onClick={() => setCurrentScreen('strategy')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50/50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-transparent hover:border-teal-200/60"
              >
                <span>Ajustar estrategia de pago</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                id="quick-registrar-pago-btn"
                onClick={() => openRecordPaymentModal()}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50/50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-transparent hover:border-teal-200/60"
              >
                <span>Registrar pago realizado</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          <button
            id="quick-add-debt-btn"
            onClick={openAddDebtModal}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar nueva deuda</span>
          </button>
        </section>

      </div>

      {/* Row 4: Vista Previa de Obligaciones Registradas con Navegación Contextual */}
      <section aria-label="Obligaciones registradas" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Mis obligaciones registradas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vista consolidada de deudas que componen este resumen
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddDebtModal}
              className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 hover:bg-teal-100 cursor-pointer"
              title="Agregar deuda"
              aria-label="Registrar nueva deuda"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentScreen('debts')}
              className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline ml-1 cursor-pointer"
            >
              Ver todas ({debts.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                <th className="pb-3 font-semibold">Nombre</th>
                <th className="pb-3 font-semibold">Tasa</th>
                <th className="pb-3 font-semibold text-right">Saldo Actual</th>
                <th className="pb-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {debts.map((debt) => (
                <tr
                  key={debt.id}
                  onClick={() => navigateToDebtDetail(debt.id)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
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
                      className="text-teal-700 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                    >
                      Detalles &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
};
