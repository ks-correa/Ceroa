import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { debtService } from '../../services/debtService';
import type { Debt } from '../../types';

type Assessment = { policyVersion: string; evaluatedAt: string; financialVersion: number; quality: string; condition: string; reason: string; budget: number | null; requiredPayments: number | null; shortfall: number | null; allowedActions: string[] };
type Alert = { id: string; financialVersion: number; createdAt: string; deliveryStatus: string };
type Overview = { evaluation: Assessment; alerts: Alert[]; telegramAlerts: boolean; canAuthorizeTelegram: boolean; canSimulate: boolean };
type Approval = { id: string; debtId: string; strategy: 'SNOWBALL' | 'AVALANCHE'; action: string; status: string; expiresAt: string; resultStatus: string | null; resultReason: string | null; assumptions: string[]; projectedMonths: number | null; projectedInterest: number | null };
const money = (value: number | null) => value === null ? '—' : `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value)} COP`;
const activeDebt = (debt: Debt) => debt.status !== 'pagada' && debt.currentBalance > 0;

export function SentinelFab() {
  const [open, setOpen] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtId, setDebtId] = useState('');
  const [strategy, setStrategy] = useState<'SNOWBALL' | 'AVALANCHE'>('AVALANCHE');
  const [approval, setApproval] = useState<Approval | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function refresh() {
    const [next, available] = await Promise.all([apiRequest<Overview>('/sentinel'), debtService.getDebts()]);
    setOverview(next); setDebts(available);
    setDebtId(previous => available.some(d => d.id === previous && activeDebt(d)) ? previous : available.find(activeDebt)?.id || '');
  }
  useEffect(() => { if (!open) return; let alive = true; Promise.all([apiRequest<Overview>('/sentinel'), debtService.getDebts()]).then(([next, available]) => {
    if (!alive) return; setOverview(next); setDebts(available); setDebtId(available.find(activeDebt)?.id || '');
  }).catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'No pude consultar el centinela.'); }); return () => { alive = false; }; }, [open]);
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pude completar la operación.'); } finally { setBusy(false); } }
  const evaluation = overview?.evaluation;
  const latest = overview?.alerts[0];
  const canSimulate = overview?.canSimulate && evaluation?.condition === 'OVER_CAPACITY' && !!latest && !!debtId && !approval;
  return <div className="fixed bottom-20 left-4 z-40 lg:bottom-6">
    {open && <section role="dialog" aria-modal="false" aria-label="Centinela de capacidad de pago" className="mb-3 flex max-h-[72vh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xl dark:border-amber-900 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b p-4"><h2 className="font-semibold">Centinela de capacidad de pago</h2><button type="button" aria-label="Cerrar centinela" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <div className="space-y-4 overflow-y-auto p-4 text-sm">
        <p>Compara los pagos exigibles registrados con tu presupuesto para deudas. La evaluación no modifica tu cuenta.</p>
        {!overview && !error && <p role="status">Cargando evaluación…</p>}
        {evaluation && <div className={`rounded-xl p-4 ${evaluation.condition === 'OVER_CAPACITY' ? 'bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <p className="font-semibold">{evaluation.condition === 'OVER_CAPACITY' ? 'Pagos registrados por encima del presupuesto' : evaluation.quality === 'INSUFFICIENT_DATA' ? 'Faltan datos para evaluar' : 'Pagos registrados dentro del presupuesto'}</p>
          <p className="mt-1">{evaluation.reason}</p>
          {evaluation.quality === 'COMPLETE' && <dl className="mt-3 grid grid-cols-2 gap-2"><div><dt>Presupuesto</dt><dd className="font-medium tabular-nums">{money(evaluation.budget)}</dd></div><div><dt>Pagos exigibles</dt><dd className="font-medium tabular-nums">{money(evaluation.requiredPayments)}</dd></div>{evaluation.condition === 'OVER_CAPACITY' && <div><dt>Diferencia</dt><dd className="font-medium tabular-nums">{money(evaluation.shortfall)}</dd></div>}</dl>}
          <p className="mt-2 text-xs opacity-75">Política {evaluation.policyVersion} · evaluado {new Date(evaluation.evaluatedAt).toLocaleString('es-CO')}</p>
        </div>}
        <button type="button" disabled={busy} onClick={() => void run(async () => { await apiRequest('/sentinel/evaluate', { method: 'POST' }); await refresh(); setApproval(null); })} className="rounded-lg border border-teal-700 px-3 py-2 font-medium text-teal-800 disabled:opacity-50 dark:text-teal-300">Actualizar evaluación</button>
        {overview && <label className="flex items-start gap-2 rounded-lg border p-3"><input type="checkbox" checked={overview.telegramAlerts} disabled={busy || (!overview.telegramAlerts && !overview.canAuthorizeTelegram)} onChange={event => { const checked = event.target.checked; void run(async () => { setOverview(await apiRequest<Overview>('/sentinel/telegram-consent', { method: 'PUT', body: JSON.stringify({ telegramAlerts: checked }) })); }); }} /><span>Recibir alertas por Telegram <small className="block text-slate-500">Requiere Ceroa Plus y un chat privado vinculado. Las alertas de la app siguen disponibles.</small></span></label>}
        {canSimulate && <div className="space-y-2 rounded-xl border p-3"><h3 className="font-semibold">Explorar un escenario hipotético</h3><p>Elige la deuda y la estrategia. Primero verás la autorización exacta; la simulación solo se ejecuta al aprobarla.</p><label className="block">Deuda<select value={debtId} onChange={event => setDebtId(event.target.value)} className="mt-1 w-full rounded border bg-white p-2 dark:bg-slate-900">{debts.filter(activeDebt).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label className="block">Estrategia<select value={strategy} onChange={event => setStrategy(event.target.value as 'SNOWBALL' | 'AVALANCHE')} className="mt-1 w-full rounded border bg-white p-2 dark:bg-slate-900"><option value="AVALANCHE">Avalancha</option><option value="SNOWBALL">Bola de nieve</option></select></label><button disabled={busy} type="button" onClick={() => void run(async () => { const result = await apiRequest<Approval>('/sentinel/approvals', { method: 'POST', body: JSON.stringify({ alertId: latest!.id, debtId, strategy }) }); setApproval(result); })} className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50">Preparar autorización</button></div>}
        {evaluation?.condition === 'OVER_CAPACITY' && !overview?.canSimulate && <p>La simulación hipotética está disponible con Ceroa Plus. La alerta y sus cifras ya están disponibles para revisar.</p>}
        {approval && <div className="space-y-2 rounded-xl border-2 border-teal-700 p-3"><h3 className="font-semibold">{approval.status === 'PENDING' ? 'Autorizar una simulación' : 'Estado de la autorización'}</h3><p>Acción: generar una simulación hipotética de {debts.find(d => d.id === approval.debtId)?.name || 'la deuda elegida'} con {approval.strategy === 'AVALANCHE' ? 'avalancha' : 'bola de nieve'}. No registra pagos ni cambia la estrategia activa.</p><p>Estado: {approval.status}. Vence: {new Date(approval.expiresAt).toLocaleString('es-CO')}.</p>{approval.status === 'PENDING' && <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void run(async () => setApproval(await apiRequest<Approval>(`/sentinel/approvals/${approval.id}/approve`, { method: 'POST' })))} className="rounded-lg bg-teal-700 px-3 py-2 text-white disabled:opacity-50">Aprobar simulación</button><button type="button" disabled={busy} onClick={() => void run(async () => setApproval(await apiRequest<Approval>(`/sentinel/approvals/${approval.id}/discard`, { method: 'POST' })))} className="rounded-lg border px-3 py-2 disabled:opacity-50">Descartar</button></div>}{approval.resultReason && <p role="status">{approval.resultReason}</p>}{approval.status === 'COMPLETED' && <p><strong>Escenario hipotético:</strong> {approval.projectedMonths ?? '—'} meses; intereses proyectados {money(approval.projectedInterest)}.</p>}{approval.assumptions?.length > 0 && <ul className="list-disc pl-5">{approval.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul>}</div>}
        {error && <p role="alert" className="text-red-700 dark:text-red-400">{error}</p>}
      </div>
    </section>}
    <button type="button" aria-label="Abrir centinela de capacidad de pago" aria-expanded={open} onClick={() => { setOpen(value => !value); setError(''); }} className="flex items-center gap-2 rounded-full bg-amber-700 px-4 py-3 text-white shadow-lg"><ShieldAlert size={20} /><span className="hidden sm:inline">Centinela</span></button>
  </div>;
}
