import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { subscriptionService, type Offer, type Periodicity, type Subscription } from '../../services/subscriptionService';
import type { PlanAccess } from '../../services/planService';

export const SubscriptionView: React.FC = () => {
  const { planAccess, setCurrentScreen, refreshAllData } = useApp();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [plusCapabilities, setPlusCapabilities] = useState<PlanAccess | null>(null);
  const [ceroCapabilities, setCeroCapabilities] = useState<PlanAccess | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selected, setSelected] = useState<Periodicity>('MONTHLY');
  const [phase, setPhase] = useState('LOADING');
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const [catalog, current, capabilities, cero] = await Promise.all([subscriptionService.offers(), subscriptionService.current(), subscriptionService.capabilities(), subscriptionService.ceroCapabilities()]);
      setPlusCapabilities(capabilities);
      setCeroCapabilities(cero);
      setOffers(catalog); setSubscription(current); setPhase(current?.status ?? 'READY');
      if (current?.status === 'ACTIVE') await refreshAllData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible cargar la oferta.'); setPhase('ERROR'); }
  };
  useEffect(() => { void load(); }, []);
  const checkout = async () => {
    setPhase('CREATING'); setError('');
    try {
      const result = await subscriptionService.checkout(selected);
      setSubscription(result);
      if (result.checkoutUrl && result.status === 'PENDING') {
        setPhase('REDIRECTING'); sessionStorage.setItem('ceroa-plus-return', '1'); window.location.assign(result.checkoutUrl);
      } else setPhase(result.status);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible iniciar el pago.'); setPhase('ERROR'); }
  };
  const chosen = offers.find(offer => offer.periodicity === selected);
  return <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <button type="button" onClick={() => setCurrentScreen('profile')} className="underline focus-visible:outline-2">Volver a Perfil</button>
    <h1 className="text-3xl font-bold">Ceroa Plus</h1>
    <p>Plan vigente: {planAccess?.plusActive ? 'Ceroa Plus' : 'Cero'}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section className="rounded-2xl border p-6"><h2 className="text-xl font-bold">Cero</h2><ul className="list-disc pl-5 mt-3 space-y-2 text-sm">{ceroCapabilities?.limits.maxDetailedDebts != null && <li>Hasta {ceroCapabilities.limits.maxDetailedDebts} deudas</li>}{ceroCapabilities?.capabilities.payments && <li>Gestión de pagos</li>}{ceroCapabilities?.capabilities.dashboard && <li>Dashboard básico</li>}{ceroCapabilities?.capabilities.snowballAndAvalanche && <li>Bola de Nieve y Avalancha</li>}{ceroCapabilities?.limits.strategyDetailLevel === 'BASIC' && <li>Detalle básico de estrategia</li>}</ul></section>
      <section className="rounded-2xl border border-teal-500 p-6"><h2 className="text-xl font-bold">Ceroa Plus</h2><ul className="list-disc pl-5 mt-3 space-y-2 text-sm">{plusCapabilities?.limits.maxDetailedDebts === null && <li>Deudas sin límite de 2</li>}{plusCapabilities?.capabilities.fullStrategyDetail && <li>Detalle completo de estrategias</li>}{plusCapabilities?.capabilities.simulation && <li>Simular</li>}{plusCapabilities?.capabilities.advancedReminders && <li>Recordatorios y alertas avanzados</li>}{plusCapabilities?.capabilities.detailedMonthlySummary && <li>Resumen mensual detallado</li>}</ul></section>
    </div>
    {!planAccess?.plusActive && <section className="space-y-4" aria-label="Elegir periodicidad">
      <fieldset disabled={phase === 'CREATING' || phase === 'REDIRECTING'}><legend className="font-bold">Periodicidad</legend><div className="flex flex-wrap gap-4 mt-2">
        {offers.map(offer => <label key={offer.periodicity} className="rounded-lg border p-3 cursor-pointer"><input type="radio" name="periodicity" checked={selected === offer.periodicity} onChange={() => setSelected(offer.periodicity)} /> {offer.periodicity === 'MONTHLY' ? 'Mensual' : 'Anual'}</label>)}
      </div></fieldset>
      {chosen && <p>{chosen.price != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: chosen.currency }).format(chosen.price) : 'Precio no configurado'} por {selected === 'MONTHLY' ? 'mes' : 'año'}. Renovación automática al finalizar cada periodo mientras la suscripción esté activa y no cancelada.</p>}
      {phase === 'PENDING' ? <div className="flex gap-4"><button type="button" className="underline" onClick={() => void load()}>Consultar confirmación</button>{subscription?.checkoutUrl && <a href={subscription.checkoutUrl} className="underline">Volver a Mercado Pago</a>}</div> : <button type="button" disabled={!chosen?.available || phase === 'LOADING' || phase === 'CREATING' || phase === 'REDIRECTING'} onClick={() => void checkout()} className="rounded-lg bg-teal-700 text-white px-4 py-2 disabled:opacity-50 focus-visible:outline-2">Continuar con Mercado Pago</button>}
    </section>}
    <p role={phase === 'ERROR' ? 'alert' : 'status'} aria-live="polite">{error || ({ LOADING: 'Cargando oferta…', CREATING: 'Creando operación…', REDIRECTING: 'Continuando con Mercado Pago…', PENDING: 'Esperando confirmación de Mercado Pago. Plus aún no está activo.', ACTIVE: 'Suscripción confirmada.', REJECTED: 'Operación rechazada.', CANCELLED: 'Operación cancelada.', ERROR: 'Ocurrió un error. Puedes reintentar.' } as Record<string, string>)[phase]}</p>
    {subscription?.status === 'ACTIVE' && <p>{subscription.periodicity === 'MONTHLY' ? 'Mensual' : 'Anual'} · Renovación automática {subscription.nextPaymentAt ? `· Próximo cobro ${new Date(subscription.nextPaymentAt).toLocaleDateString('es-CO')}` : ''}</p>}
  </main>;
};
