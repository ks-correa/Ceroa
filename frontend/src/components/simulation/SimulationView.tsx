import React from 'react';
import {
  Zap,
  Plus,
  Trash2,
  Info,
  TrendingDown,
  Clock,
  Sparkles,
  Sliders,
  AlertCircle,
  RotateCcw,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useSimulation } from './useSimulation';
import { StrategyType } from '../../types';

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

  const isPlus = userProfile.plan === 'plus';

  const {
    selectedDebtId,
    setSelectedDebtId,
    selectedStrategy,
    setSelectedStrategy,
    events,
    addEvent,
    updateEvent,
    removeEvent,
    status,
    result,
    error,
    eventErrors,
    executeSimulation,
    resetScenario,
    isCalculating
  } = useSimulation(debts, activeStrategy, isPlus);

  // Vista de restricción de plan para usuarios Cero
  if (!isPlus) {
    return (
      <div className="max-w-2xl mx-auto py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-[var(--ceroa-primary)]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">
          Simular pagos es exclusivo de Ceroa Plus
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Prueba pagos extraordinarios futuros o incrementos en tus cuotas mensuales para proyectar el impacto en capital, intereses y tiempo sin modificar tu información real.
        </p>
        <button
          id="simulation-upgrade-cta-btn"
          type="button"
          onClick={() => setCurrentScreen('subscription')}
          className="mt-6 px-6 py-3 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
        >
          Conocer Ceroa Plus
        </button>
      </div>
    );
  }

  const activeDebts = debts.filter((d) => d.currentBalance > 0);

  if (activeDebts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-14 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
        <Info className="w-12 h-12 mx-auto text-slate-400" />
        <h1 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">
          Sin obligaciones para simular
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Registra al menos una deuda con saldo pendiente para configurar un escenario de simulación.
        </p>
      </div>
    );
  }

  const handleExecute = async () => {
    const success = await executeSimulation();
    if (success) {
      showToast('¡Escenario simulado con éxito!');
    } else if (error) {
      showToast(error);
    }
  };

  const handleDiscard = () => {
    resetScenario();
    showToast('Escenario hipotético descartado.');
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-cyan-100 dark:bg-cyan-950 text-teal-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Simulación de Pagos — Ceroa Plus</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Proyecta pagos futuros
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Configura abonos hipotéticos y variaciones de cuota mensual para evaluar cómo acelerarías el pago de tu deuda, comparando la situación actual contra la simulada.
        </p>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Configuración del Escenario (5 columnas) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              Ajustes del escenario
            </h2>
            <span className="text-[11px] font-semibold text-slate-500">
              Hipotético (no modifica datos)
            </span>
          </div>

          {/* Selector de Deuda (HU-045 CA-02) */}
          <div className="space-y-1.5">
            <label htmlFor="simulation-debt-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Obligación a simular
            </label>
            <select
              id="simulation-debt-select"
              value={selectedDebtId}
              onChange={(e) => setSelectedDebtId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {activeDebts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.entity}) — Saldo: ${formatNumber(d.currentBalance)}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Estrategia de Simulación (HU-045 CA-02) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Estrategia de simulación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="strategy-snowball-btn"
                onClick={() => setSelectedStrategy('snowball')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                  selectedStrategy === 'snowball'
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-[var(--ceroa-primary)] text-teal-800 dark:text-cyan-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Bola de Nieve
              </button>
              <button
                type="button"
                id="strategy-avalanche-btn"
                onClick={() => setSelectedStrategy('avalanche')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                  selectedStrategy === 'avalanche'
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-[var(--ceroa-primary)] text-teal-800 dark:text-cyan-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Avalancha
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Nota: La estrategia seleccionada aquí rige únicamente este escenario simulado. Tu estrategia activa en el perfil financiero permanece intacta.
            </p>
          </div>

          {/* Colección Editable de Eventos Hipotéticos (HU-045 CA-03 a CA-05) */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Eventos de pago hipotéticos ({events.length})
              </h3>
              <button
                type="button"
                id="simulation-add-event-btn"
                onClick={addEvent}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-cyan-400 hover:text-teal-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar evento</span>
              </button>
            </div>

            {events.map((ev, index) => {
              const eventError = eventErrors[ev.id];
              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Evento #{index + 1}
                    </span>
                    {events.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEvent(ev.id)}
                        aria-label={`Eliminar evento ${index + 1}`}
                        className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Periodo o Mes */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`event-period-${ev.id}`}
                        className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                      >
                        Periodo (Mes #{ev.period || 1})
                      </label>
                      <input
                        id={`event-period-${ev.id}`}
                        type="number"
                        min="1"
                        step="1"
                        value={ev.period ?? ''}
                        onChange={(e) => updateEvent(ev.id, { period: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="1"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Fecha opcional */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`event-date-${ev.id}`}
                        className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                      >
                        Fecha futura (opcional)
                      </label>
                      <input
                        id={`event-date-${ev.id}`}
                        type="date"
                        value={ev.date || ''}
                        onChange={(e) => updateEvent(ev.id, { date: e.target.value || undefined })}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Abono adicional */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`event-extra-${ev.id}`}
                        className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                      >
                        Abono adicional (COP)
                      </label>
                      <input
                        id={`event-extra-${ev.id}`}
                        type="number"
                        min="1"
                        step="10000"
                        value={ev.extraPayment ?? ''}
                        onChange={(e) => updateEvent(ev.id, { extraPayment: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Ej. 500000"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    {/* Cuota mensual modificada */}
                    <div className="space-y-1">
                      <label
                        htmlFor={`event-modified-${ev.id}`}
                        className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                      >
                        Nueva cuota mensual (COP)
                      </label>
                      <input
                        id={`event-modified-${ev.id}`}
                        type="number"
                        min="1"
                        step="10000"
                        value={ev.modifiedMonthlyPayment ?? ''}
                        onChange={(e) => updateEvent(ev.id, { modifiedMonthlyPayment: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Ej. 350000"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    * Si modificas la cuota mensual, rige a partir de este periodo en adelante.
                  </p>

                  {eventError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-500 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{eventError}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mensaje global de error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Botones de Acción (HU-045 & HU-047) */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              id="simulation-execute-btn"
              onClick={handleExecute}
              disabled={isCalculating}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isCalculating ? 'Procesando simulación...' : 'Ejecutar simulación'}</span>
            </button>

            <button
              type="button"
              id="simulation-discard-btn"
              onClick={handleDiscard}
              disabled={isCalculating}
              className="flex items-center justify-center gap-1.5 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
          </div>

          {/* Descargo legal / de inmutabilidad */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              La simulación es estrictamente hipotética. No genera pagos reales, no modifica el saldo de tus obligaciones ni altera tu historial crediticio.
            </p>
          </div>
        </div>

        {/* Columna Derecha: Resultados y Comparación (7 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Estado de carga */}
          {status === 'LOADING' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                Calculando escenario en el motor financiero
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Procesando línea base y proyecciones estimadas con supuestos financieros válidos...
              </p>
            </div>
          )}

          {/* Estado inicial sin simulación ejecutada */}
          {status === 'EMPTY' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                Escenario listo para configurar
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Selecciona la obligación, define los pagos hipotéticos a la izquierda y presiona "Ejecutar simulación" para comparar tu situación actual con la proyectada.
              </p>
            </div>
          )}

          {/* Estado: Datos Insuficientes (HU-046) */}
          {status === 'INSUFFICIENT_DATA' && result && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <h3 className="text-base font-bold">Datos insuficientes para simular</h3>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                {result.statusReason || 'La obligación seleccionada no cuenta con los datos financieros necesarios para proyectar la amortización sin inventar información ficticia.'}
              </p>
              <div className="p-3 bg-white/70 dark:bg-slate-900/60 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-600 dark:text-slate-400">
                En cumplimiento de las políticas financieras de Ceroa, nunca generamos proyecciones con tasas o índices artificiales. Revisa los datos de tu obligación en la sección Deudas.
              </div>
            </div>
          )}

          {/* Estado de Éxito: Resultados y Comparación (HU-046) */}
          {status === 'SUCCESS' && result && result.baseline && result.simulated && (
            <div className="space-y-6">
              {/* Banner de identificación clara */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-slate-900 border border-teal-200 dark:border-teal-900 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--ceroa-primary)] flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-extrabold text-slate-900 dark:text-white block">
                    Escenario simulado con éxito ({result.debt.name})
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Estrategia simulada: {result.simulatedStrategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'}. Proyección estimada no contractual.
                  </span>
                </div>
              </div>

              {/* Grid de Resumen Comparativo (HU-046 CA-01 a CA-05) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tarjeta: Ahorro Estimado de Intereses */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50/60 dark:from-slate-900 dark:to-teal-950/40 border border-teal-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-cyan-300">
                      Ahorro Estimado en Intereses
                    </span>
                    <div className="text-3xl font-extrabold text-teal-900 dark:text-cyan-300 mt-2">
                      {formatCurrency(result.differences?.estimatedInterestSavings || 0)}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-800 text-white">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>Menor costo financiero proyectado</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-teal-100 dark:border-slate-800 flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-4">
                    <span>Intereses simulados:</span>
                    <strong className="text-teal-900 dark:text-cyan-300">
                      {formatCurrency(result.simulated.totalInterest)}
                    </strong>
                  </div>
                </div>

                {/* Tarjeta: Tiempo Estimado y Reducción de Plazo */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Fecha Estimada de Pago
                    </span>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                      {result.simulated.estimatedPayoffDate}
                    </div>
                    {result.differences && result.differences.monthsReduced > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{result.differences.monthsReduced} meses antes</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-400 mt-4">
                    <span>Línea base actual:</span>
                    <strong className="text-slate-700 dark:text-slate-300">
                      {result.baseline.estimatedPayoffDate} ({result.baseline.estimatedMonths} meses)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Comparación Visual: ACTUAL vs SIMULADO (HU-046 CA-01) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Comparación Actual vs Simulado
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      Actual (Línea Base)
                    </span>
                    <span className="flex items-center gap-1.5 text-teal-700 dark:text-cyan-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span>
                      Simulado
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Bloque Actual */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                      Situación Actual (Línea Base)
                    </span>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plazo proyectado:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {result.baseline.estimatedMonths} meses
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fecha estimada:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {result.baseline.estimatedPayoffDate}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Intereses proyectados:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {formatCurrency(result.baseline.totalInterest)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Capital a pagar:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {formatCurrency(result.baseline.totalPrincipal)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Bloque Simulado */}
                  <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900 space-y-2">
                    <span className="text-xs font-extrabold text-teal-800 dark:text-cyan-300 uppercase tracking-wider block">
                      Escenario Simulado
                    </span>
                    <div className="text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plazo simulado:</span>
                        <strong className="text-teal-900 dark:text-cyan-200">
                          {result.simulated.estimatedMonths} meses
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fecha estimada:</span>
                        <strong className="text-teal-900 dark:text-cyan-200">
                          {result.simulated.estimatedPayoffDate}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Intereses simulados:</span>
                        <strong className="text-teal-900 dark:text-cyan-200">
                          {formatCurrency(result.simulated.totalInterest)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Capital a pagar:</span>
                        <strong className="text-teal-900 dark:text-cyan-200">
                          {formatCurrency(result.simulated.totalPrincipal)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supuestos de Cálculo (RQF-025) */}
              {result.assumptions && result.assumptions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-teal-700 dark:text-cyan-400" />
                    Supuestos financieros de la simulación
                  </h4>
                  <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
                    {result.assumptions.map((assumption, idx) => (
                      <li key={idx}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Detalle por Periodo Recibido (HU-046 CA-02) */}
              {result.periods && result.periods.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Cronograma Detallado por Periodo
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold">
                      {result.periods.length} periodos proyectados
                    </span>
                  </div>

                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-left text-xs border-collapse min-w-[620px]">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-2">Periodo</th>
                          <th className="py-2.5 px-2">Fecha</th>
                          <th className="py-2.5 px-2 text-right">Saldo Inicial</th>
                          <th className="py-2.5 px-2 text-right">Pago Normal</th>
                          <th className="py-2.5 px-2 text-right">Abono Extra</th>
                          <th className="py-2.5 px-2 text-right">Intereses</th>
                          <th className="py-2.5 px-2 text-right">Abono Capital</th>
                          <th className="py-2.5 px-2 text-right">Saldo Final</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {result.periods.map((p) => (
                          <tr key={p.period} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2.5 px-2 font-bold text-slate-800 dark:text-slate-200">
                              #{p.period}
                            </td>
                            <td className="py-2.5 px-2 text-slate-500">
                              {p.date}
                            </td>
                            <td className="py-2.5 px-2 text-right text-slate-600 dark:text-slate-300">
                              ${formatNumber(p.openingBalance)}
                            </td>
                            <td className="py-2.5 px-2 text-right text-slate-800 dark:text-slate-200">
                              ${formatNumber(p.normalPayment)}
                            </td>
                            <td className="py-2.5 px-2 text-right text-teal-700 dark:text-cyan-400 font-bold">
                              {p.extraPayment > 0 ? `+$${formatNumber(p.extraPayment)}` : '—'}
                            </td>
                            <td className="py-2.5 px-2 text-right text-rose-500 dark:text-rose-400">
                              ${formatNumber(p.interest)}
                            </td>
                            <td className="py-2.5 px-2 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                              ${formatNumber(p.principal)}
                            </td>
                            <td className="py-2.5 px-2 text-right font-extrabold text-slate-900 dark:text-white">
                              ${formatNumber(p.closingBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
