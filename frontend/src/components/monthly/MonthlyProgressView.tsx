import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { monthlyProgressService, type MonthlyProgress } from '../../services/monthlyProgressService';

const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 }).format(value);
const periodLabel = (year: number, month: number) => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(new Date(Date.UTC(year, month - 1, 15)));

export const MonthlyProgressView: React.FC = () => {
  const { setCurrentScreen } = useApp();
  const parts = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', timeZone: 'America/Bogota' }).formatToParts(new Date());
  const currentYear = Number(parts.find(part => part.type === 'year')?.value);
  const currentMonth = Number(parts.find(part => part.type === 'month')?.value);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<MonthlyProgress | null>(null);
  const [phase, setPhase] = useState<'LOADING' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [error, setError] = useState('');
  const [showRestriction, setShowRestriction] = useState(true);
  useEffect(() => {
    let active = true;
    setPhase('LOADING'); setData(null);
    monthlyProgressService.get(year, month).then(result => {
      if (active) { setData(result); setPhase('SUCCESS'); }
    }).catch(cause => {
      if (active) { setError(cause instanceof Error ? cause.message : 'No fue posible consultar el resumen.'); setPhase('ERROR'); }
    });
    return () => { active = false; };
  }, [year, month, retry]);
  const changeMonth = (delta: number) => {
    const next = new Date(Date.UTC(year, month - 1 + delta, 15));
    setYear(next.getUTCFullYear()); setMonth(next.getUTCMonth() + 1);
  };
  const indicator = (label: string, value: number | null | undefined, format: 'money' | 'number' | 'percent' = 'money') =>
    value == null ? null : <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4"><dt className="text-sm text-slate-500 dark:text-slate-300">{label}</dt><dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{format === 'money' ? money(value) : format === 'percent' ? `${value}%` : value}</dd></div>;
  return <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
    <button onClick={() => setCurrentScreen('dashboard')} className="text-sm font-semibold text-teal-700 dark:text-cyan-400 focus-visible:outline-2">← Inicio</button>
    <header><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Resumen mensual de progreso</h1><p className="text-sm text-slate-500">Evolución de tus deudas registrada por Ceroa</p></header>
    <section aria-label="Seleccionar mes" className="flex items-center gap-3 flex-wrap">
      <button aria-label="Mes anterior" onClick={() => changeMonth(-1)} className="rounded-lg border px-3 py-2 focus-visible:outline-2">Anterior</button>
      <strong aria-live="polite" className="min-w-40 text-center capitalize">{periodLabel(year, month)}</strong>
      <button aria-label="Mes siguiente" disabled={year === currentYear && month === currentMonth} onClick={() => changeMonth(1)} className="rounded-lg border px-3 py-2 disabled:opacity-40 focus-visible:outline-2">Siguiente</button>
    </section>
    {phase === 'LOADING' && <p role="status">Cargando resumen mensual…</p>}
    {phase === 'ERROR' && <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)} className="underline">Reintentar</button></p>}
    {data && <>
      {data.status === 'EMPTY' && <p role="status">No hay información registrada para este periodo.</p>}
      {data.status === 'INSUFFICIENT_DATA' && <p role="status">No hay historial suficiente para calcular el saldo al inicio de este mes con certeza.</p>}
      {data.status === 'SUCCESS' && <>
        <section aria-label="Datos del periodo"><h2 className="text-lg font-bold mb-3">Datos del periodo</h2><dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {indicator('Deuda al inicio', data.openingDebt)}{indicator(month === currentMonth && year === currentYear ? 'Deuda actual confirmada' : 'Deuda al cierre', data.closingDebt)}
          {indicator('Pagos netos confirmados', data.totalPaid)}{indicator('Capital reducido', data.principalReduced)}
          {indicator('Interés registrado', data.recordedInterest)}{indicator('Interés proyectado', data.projectedInterest)}
          {indicator('Progreso de estrategia', data.strategyProgress, 'percent')}{indicator('Pagos registrados, neto', data.registeredPaymentsCount, 'number')}{indicator('Deudas cerradas, neto', data.closedDebtsCount, 'number')}
        </dl><p className="mt-2 text-xs text-slate-500">Las correcciones de pagos se registran en el mes en que se hacen. El cambio neto de saldo también incluye altas y ediciones de deudas.</p></section>
      </>}
      <section aria-label="Comparación con mes anterior"><h2 className="text-lg font-bold mb-2">Comparación con {periodLabel(data.comparison.year, data.comparison.month)}</h2>
        {data.comparison.status === 'SUCCESS' ? <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">{indicator('Cambio de deuda al cierre', data.comparison.closingDebtChange)}{indicator('Cambio de pagos confirmados', data.comparison.totalPaidChange)}{indicator('Cambio de reducción de saldo', data.comparison.principalReducedChange)}{indicator('Cambio de cantidad de pagos', data.comparison.paymentsCountChange, 'number')}{indicator('Cambio de deudas cerradas', data.comparison.closedDebtsCountChange, 'number')}</dl> : <p>No hay historial suficiente del mes anterior para comparar.</p>}
      </section>
      {data.detailLevel === 'BASIC' && showRestriction && <aside className="rounded-xl border border-teal-300 p-4"><h2 className="font-bold">Detalle mensual avanzado de Ceroa Plus</h2><p className="text-sm my-2">Tu plan Cero muestra el resumen básico. Los indicadores adicionales requieren Ceroa Plus activo.</p><div className="flex gap-3"><button onClick={() => setCurrentScreen('subscription')} className="rounded-lg bg-teal-700 px-3 py-2 text-white">Conocer Ceroa Plus</button><button onClick={() => setShowRestriction(false)} className="underline">Cerrar</button></div></aside>}
    </>}
  </main>;
};
