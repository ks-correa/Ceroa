import React from 'react';
import { 
  Snowflake, 
  Flame, 
  CheckCircle2, 
  FileDown, 
  Info,
  AlertTriangle,
  Loader2,
  Sparkles,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useStrategyData } from './useStrategyData';
import { StrategyType } from '../../types';

export const StrategicPlanView: React.FC = () => {
  const { 
    debts, 
    activeStrategy, 
    formatCurrency, 
    setIsExportReportOpen,
    setCurrentScreen
  } = useApp();

  const {
    data,
    isLoading,
    error,
    isChanging,
    pendingStrategy,
    changeError,
    changeStrategy,
    changePriority
  } = useStrategyData();

  // Si no hay deudas registradas
  if (debts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
        <Info className="w-11 h-11 mx-auto text-slate-400" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Aún no hay deudas para ordenar</h1>
        <p className="mt-2 text-sm text-slate-500">Registra una obligación para aplicar Bola de Nieve o Avalancha.</p>
      </div>
    );
  }

  const isPlus = data?.plan?.toLowerCase() === 'plus';
  const effectiveStrategy = data?.activeStrategy ?? activeStrategy;
  const orderedDebts = data?.orderedDebts ?? [];
  const summaryProj = data?.summaryProjection;
  const comparison = data?.comparison;
  const hasNonComparable = Boolean(data?.hasNonComparableDebts);

  const handleSelectStrategy = (target: StrategyType) => {
    if (target === effectiveStrategy || isChanging) return;
    void changeStrategy(target);
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      {isLoading && <span className="sr-only" role="status">Cargando datos de la estrategia...</span>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Estrategia de Pago
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              isPlus 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
              {isPlus ? 'Ceroa Plus' : 'Plan Cero'}
            </span>
          </div>
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

      {/* Alerta de Error de carga inicial */}
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Alerta de Error al cambiar estrategia (TT-039.2) */}
      {changeError && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>No se pudo cambiar la estrategia o prioridad: {changeError}. Se mantiene la configuración anterior.</span>
        </div>
      )}

      {/* Alerta si Avalancha tiene tasas indexadas o no comparables */}
      {effectiveStrategy === 'avalanche' && hasNonComparable && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>Existen obligaciones con tasa indexada o no disponible que impiden determinar con certeza el orden de prioridad global en Avalancha.</span>
        </div>
      )}

      {/* Selector de Estrategia Activa (HU-039) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Estrategia Activa
          </span>
          {isChanging && (
            <span className="text-xs font-semibold text-teal-700 dark:text-cyan-400 flex items-center gap-1.5" role="status">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Confirmando cambio con el servidor...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" role="radiogroup" aria-label="Estrategia de pago">
          
          {/* Card 1: Bola de Nieve */}
          <div
            id="strategy-snowball-card"
            onClick={() => handleSelectStrategy('snowball')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelectStrategy('snowball');
              }
            }}
            role="radio"
            aria-checked={effectiveStrategy === 'snowball'}
            tabIndex={0}
            className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              effectiveStrategy === 'snowball'
                ? 'bg-gradient-to-br from-white to-cyan-50/40 dark:from-slate-900 dark:to-teal-950/40 border-[var(--ceroa-primary)] dark:border-cyan-400 shadow-sm ring-4 ring-[var(--ceroa-primary)]/10'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${effectiveStrategy === 'snowball' ? 'bg-[var(--ceroa-primary)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <Snowflake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Bola de Nieve
                    </h3>
                    {/* CA-02: descripción aprobada exacta */}
                    <span className="text-xs text-[var(--ceroa-primary)] dark:text-cyan-400 font-semibold block">
                      prioriza la deuda con menor saldo
                    </span>
                  </div>
                </div>

                {/* CA-04 & CA-05: Estado Activa vs Pendiente */}
                {effectiveStrategy === 'snowball' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[var(--ceroa-primary)] text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ACTIVA
                  </span>
                ) : pendingStrategy === 'snowball' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cambiando...
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Enfócate en pagar primero las obligaciones con menor saldo para lograr victorias tempranas y reducir rápidamente el número de cuentas pendientes.
              </p>
            </div>
          </div>

          {/* Card 2: Avalancha */}
          <div
            id="strategy-avalanche-card"
            onClick={() => handleSelectStrategy('avalanche')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelectStrategy('avalanche');
              }
            }}
            role="radio"
            aria-checked={effectiveStrategy === 'avalanche'}
            tabIndex={0}
            className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
              effectiveStrategy === 'avalanche'
                ? 'bg-gradient-to-br from-white to-cyan-50/40 dark:from-slate-900 dark:to-teal-950/40 border-[var(--ceroa-primary)] dark:border-cyan-400 shadow-sm ring-4 ring-[var(--ceroa-primary)]/10'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${effectiveStrategy === 'avalanche' ? 'bg-[var(--ceroa-primary)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Avalancha
                    </h3>
                    {/* CA-03: descripción aprobada exacta */}
                    <span className="text-xs text-[var(--ceroa-primary)] dark:text-cyan-400 font-semibold block">
                      prioriza la deuda con mayor tasa de interés
                    </span>
                  </div>
                </div>

                {/* CA-04 & CA-05: Estado Activa vs Pendiente */}
                {effectiveStrategy === 'avalanche' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[var(--ceroa-primary)] text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ACTIVA
                  </span>
                ) : pendingStrategy === 'avalanche' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cambiando...
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Dirige el esfuerzo a las obligaciones con mayor tasa de interés efectiva para minimizar el costo financiero total a lo largo del tiempo.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Proyección Resumida (HU-040 CA-05 para Cero & HU-041 para Plus) */}
      {summaryProj && summaryProj.available ? (
        <div className="rounded-3xl border border-teal-200/80 bg-teal-50/50 dark:border-teal-900 dark:bg-teal-950/20 p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700 dark:text-cyan-300" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-teal-800 dark:text-cyan-300">
                PROYECCIÓN ESTIMADA ({isPlus ? 'CEROA PLUS' : 'PLAN CERO'})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              Estimación basada en capacidad mensual registrada · No constituye compromiso contractual
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Fecha estimada libre de deuda</span>
              <strong className="text-base sm:text-lg text-slate-900 dark:text-white font-extrabold">
                {summaryProj.payoffDate ?? 'Calculando...'}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Tiempo proyectado</span>
              <strong className="text-base sm:text-lg text-slate-900 dark:text-white font-extrabold">
                {summaryProj.months != null ? `${summaryProj.months} meses` : 'En revisión'}
              </strong>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block uppercase font-bold">Intereses proyectados</span>
              <strong className="text-base sm:text-lg text-teal-700 dark:text-cyan-300 font-extrabold">
                {summaryProj.totalInterest != null ? formatCurrency(summaryProj.totalInterest) : 'En revisión'}
              </strong>
            </div>
          </div>
        </div>
      ) : summaryProj && !summaryProj.available ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Proyección no disponible: {summaryProj.missingReason ?? 'Datos insuficientes para simular la amortización.'}</span>
        </div>
      ) : null}

      {/* Comparativa Bola de Nieve vs Avalancha (HU-041 CA-06: SOLO CEROA PLUS) */}
      {isPlus && comparison && comparison.available && comparison.snowball && comparison.avalanche && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--ceroa-primary)] dark:text-cyan-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Comparativa: Bola de Nieve vs Avalancha
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Diferencias financieras calculadas entre ambas alternativas para tu cartera actual.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Bola de Nieve stats */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Bola de Nieve</span>
                <Snowflake className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Intereses proyectados:</span><strong>{formatCurrency(comparison.snowball.totalInterest)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Fecha estimada:</span><strong>{comparison.snowball.payoffDate}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Plazo estimado:</span><strong>{comparison.snowball.months} meses</strong></div>
              </div>
            </div>

            {/* Avalancha stats */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Avalancha</span>
                <Flame className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between"><span className="text-slate-400">Intereses proyectados:</span><strong>{formatCurrency(comparison.avalanche.totalInterest)}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Fecha estimada:</span><strong>{comparison.avalanche.payoffDate}</strong></div>
                <div className="flex justify-between"><span className="text-slate-400">Plazo estimado:</span><strong>{comparison.avalanche.months} meses</strong></div>
              </div>
            </div>
          </div>

          {/* Factual differences without invented recommendation */}
          {comparison.interestDifference != null && (
            <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/70 dark:border-cyan-900 text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold">Diferencia en intereses: </span>
              {comparison.interestDifference > 0 ? (
                <span>Avalancha ahorra {formatCurrency(comparison.interestDifference)} frente a Bola de Nieve.</span>
              ) : comparison.interestDifference < 0 ? (
                <span>Bola de Nieve ahorra {formatCurrency(Math.abs(comparison.interestDifference))} frente a Avalancha.</span>
              ) : (
                <span>Ambas estrategias proyectan el mismo costo en intereses.</span>
              )}
              {comparison.monthsDifference != null && comparison.monthsDifference !== 0 && (
                <span className="block mt-0.5 text-slate-500 dark:text-slate-400">
                  Diferencia de plazo: {Math.abs(comparison.monthsDifference)} mes(es).
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lista de Obligaciones Priorizadas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Hoja de Ruta: {effectiveStrategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isPlus 
                ? 'Orden completo optimizado para todas tus obligaciones'
                : 'Orden básico optimizado (máximo 2 deudas consideradas en plan Cero)'}
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {orderedDebts.length} {orderedDebts.length === 1 ? 'deuda en lista' : 'deudas en lista'}
          </span>
        </div>

        {/* Notificación de plan Cero */}
        {!isPlus && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              El plan Cero prioriza hasta 2 obligaciones. Mejora a Ceroa Plus para priorizar todas tus deudas y consultar proyecciones detalladas.
            </span>
            <button
              onClick={() => setCurrentScreen('subscription')}
              className="text-xs font-bold text-[var(--ceroa-primary)] dark:text-cyan-400 hover:underline shrink-0"
            >
              Conocer Plus
            </button>
          </div>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-300">
          Bola de Nieve ordena por menor saldo; Avalancha, por mayor tasa comparable.
          Puedes elegir qué deuda atender primero: se mantienen las cuotas base y se dirige el excedente a esa deuda.
          Las demás siguen el orden de la estrategia. Las comparaciones muestran los métodos automáticos.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="priority-debt" className="text-sm font-semibold">Deuda a priorizar</label>
          <select id="priority-debt" disabled={isChanging || isLoading} value=""
            onChange={(event) => { if (event.target.value) void changePriority(event.target.value); }}
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm">
            <option value="">Selecciona una deuda</option>
            {debts.filter(debt => debt.currentBalance > 0).map(debt => (
              <option key={debt.id} value={debt.id}>{debt.name}</option>
            ))}
          </select>
          <button disabled={isChanging || isLoading} onClick={() => void changePriority(null)}
            className="text-sm font-semibold text-teal-700 dark:text-cyan-400 disabled:opacity-50">
            Restablecer orden automático
          </button>
        </div>

        {/* Deudas Priorizadas */}
        <div className="space-y-4">
          {orderedDebts.map((item) => {
            const isFocus = item.isPriority;
            const hasPriority = item.priority != null;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isFocus
                    ? 'bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-300 dark:border-cyan-700/60 shadow-xs'
                    : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Priority + Debt Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase ${
                        isFocus 
                          ? 'bg-[var(--ceroa-primary)] text-white'
                          : hasPriority
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                      }`}>
                        {hasPriority ? `PRIORIDAD ${item.priority}` : 'SIN PRIORIDAD DEFINIDA'}
                      </span>
                      
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </h3>

                      {item.entity && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({item.entity})
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.rateType === 'NONE'
                          ? 'Sin intereses'
                          : item.isRateComparable
                            ? `${item.interestRate}% ${item.rateType}`
                            : `${item.interestRate ?? 0}% ${item.rateType} (No comparable)`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFocus ? (
                        <span>
                          <strong className="text-slate-900 dark:text-white">Obligación prioritaria actual.</strong> Cubre los compromisos requeridos y concentra aquí cualquier excedente disponible.
                        </span>
                      ) : hasPriority ? (
                        <span>
                          Mantén el pago mínimo o cuota regular hasta finalizar la prioridad previa.
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400">
                          {item.rateReason ?? 'Información de tasa no comparable para Avalancha.'}
                        </span>
                      )}
                    </p>

                    {/* DATOS ACTUALES REALES */}
                    <div className="pt-1 flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <div>
                        <span>Saldo actual real: </span>
                        <strong className="text-slate-900 dark:text-white">{formatCurrency(item.currentBalance)}</strong>
                      </div>
                      {item.basePayment > 0 && (
                        <div>
                          <span>Cuota base del periodo: </span>
                          <strong className="text-slate-900 dark:text-white">{formatCurrency(item.basePayment)}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <button disabled={isChanging || isLoading} onClick={() => void changePriority(item.id)}
                    aria-label={`Priorizar ${item.name}`}
                    className="rounded-xl border border-teal-300 px-3 py-2 text-xs font-bold text-teal-700 dark:text-cyan-400 disabled:opacity-50">
                    Priorizar esta deuda
                  </button>

                  {/* Right: Payment Orientation and Plus Projections */}
                  <div className="text-left lg:text-right shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Orientación siguiente pago
                    </span>
                    <strong className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white block">
                      {formatCurrency(item.recommendedPayment ?? item.basePayment ?? 0)}
                    </strong>

                    {/* Detalle Plus por deuda (HU-041 CA-03 & CA-04) */}
                    {isPlus && item.extraPayment != null && item.extraPayment > 0 && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">
                        Incluye abono extra: +{formatCurrency(item.extraPayment)}
                      </span>
                    )}

                    {isPlus && item.projectionAvailable && (
                      <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        {item.estimatedPayoffDate && (
                          <div className="block">Fecha est.: <strong className="text-slate-800 dark:text-slate-200">{item.estimatedPayoffDate}</strong></div>
                        )}
                        {item.projectedInterest != null && (
                          <div className="block">Intereses est.: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.projectedInterest)}</strong></div>
                        )}
                      </div>
                    )}
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
