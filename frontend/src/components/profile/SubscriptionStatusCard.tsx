import { useEffect, useRef, useState } from 'react';
import { subscriptionService, type Subscription } from '../../services/subscriptionService';
import { useApp } from '../../context/AppContext';

const labels: Record<Subscription['status'], string> = {
  PENDING: 'Pendiente de confirmación', ACTIVE: 'Activa', CANCEL_PENDING: 'Procesando cancelación',
  CANCEL_SCHEDULED: 'Cancelación programada', EXPIRED: 'Vencida', REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada', ERROR: 'Error de suscripción'
};
const date = (value: string | null) => value ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(value)) : 'No disponible';

export function SubscriptionStatusCard() {
  const { planAccess, refreshAllData } = useApp();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState('');
  const cancelButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const load = async () => {
    try { setSubscription(await subscriptionService.current()); await refreshAllData(); setError(''); }
    catch { setError('No pudimos consultar tu suscripción. Intenta de nuevo.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (confirm) closeButton.current?.focus(); }, [confirm]);
  const close = () => { setConfirm(false); cancelButton.current?.focus(); };
  const cancel = async () => {
    setBusy(true); setError('');
    try {
      const result = await subscriptionService.cancelRenewal();
      setSubscription(result); setConfirm(false);
      await refreshAllData();
    } catch { setError('No se confirmó la cancelación. Tu estado anterior se conserva.'); }
    finally { setBusy(false); }
  };
  return <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-3" aria-labelledby="subscription-heading">
    <h2 id="subscription-heading" className="font-bold text-slate-900 dark:text-white">Mi suscripción</h2>
    <p>Plan actual: {planAccess?.plusActive ? 'Ceroa Plus' : 'Cero'}</p>
    {loading ? <p role="status">Cargando suscripción…</p> : subscription ? <dl className="text-sm space-y-2">
      <div><dt className="font-semibold">Periodicidad</dt><dd>{subscription.periodicity === 'MONTHLY' ? 'Mensual' : 'Anual'}</dd></div>
      <div><dt className="font-semibold">Estado</dt><dd>{labels[subscription.status]}</dd></div>
      <div><dt className="font-semibold">Inicio</dt><dd>{date(subscription.startedAt)}</dd></div>
      {subscription.status === 'ACTIVE' && <div><dt className="font-semibold">Próxima renovación</dt><dd>{date(subscription.nextPaymentAt)}</dd></div>}
      <div><dt className="font-semibold">Valor contratado</dt><dd>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: subscription.currency }).format(subscription.price)}</dd></div>
      {(subscription.status === 'CANCEL_SCHEDULED' || subscription.status === 'CANCEL_PENDING') && <div><dt className="font-semibold">Acceso Plus hasta</dt><dd>{date(subscription.accessUntil)}</dd></div>}
    </dl> : <p>No tienes una suscripción registrada.</p>}
    {subscription?.status === 'CANCEL_SCHEDULED' && <p>Tu acceso Plus continuará hasta la fecha indicada. No se realizarán nuevas renovaciones.</p>}
    {subscription?.status === 'CANCEL_PENDING' && <p role="status">Estamos procesando tu solicitud. La cancelación aún no está confirmada.</p>}
    {subscription?.canCancelRenewal && <button ref={cancelButton} type="button" onClick={() => setConfirm(true)} className="rounded-lg border border-rose-600 px-4 py-2 text-rose-700 focus-visible:outline-2">Cancelar renovación</button>}
    <button type="button" onClick={() => { setLoading(true); void load(); }} className="block underline focus-visible:outline-2">Actualizar estado</button>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    {confirm && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onKeyDown={event => {
      if (event.key === 'Escape' && !busy) close();
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === closeButton.current) { event.preventDefault(); confirmButton.current?.focus(); }
        else if (!event.shiftKey && document.activeElement === confirmButton.current) { event.preventDefault(); closeButton.current?.focus(); }
      }
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md space-y-4 text-slate-900 dark:text-white">
        <h3 id="cancel-title" className="text-lg font-bold">Cancelar futuras renovaciones</h3>
        <p>Conservarás Ceroa Plus hasta: <strong>{date(subscription?.nextPaymentAt ?? null)}</strong>.</p>
        <p>Después de la cancelación confirmada no se realizará una nueva renovación.</p>
        <div className="flex flex-wrap gap-3">
          <button ref={closeButton} type="button" disabled={busy} onClick={close} className="rounded-lg border px-4 py-2 focus-visible:outline-2">Volver</button>
          <button ref={confirmButton} type="button" disabled={busy} onClick={() => void cancel()} className="rounded-lg bg-rose-700 text-white px-4 py-2 disabled:opacity-50 focus-visible:outline-2">{busy ? 'Procesando…' : 'Confirmar cancelación'}</button>
        </div>
      </div>
    </div>}
  </section>;
}
