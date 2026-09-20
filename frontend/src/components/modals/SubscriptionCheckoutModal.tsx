import React from 'react';
import { useApp } from '../../context/AppContext';

export const SubscriptionCheckoutModal: React.FC = () => {
  const { isSubscriptionModalOpen, setIsSubscriptionModalOpen, setCurrentScreen } = useApp();
  if (!isSubscriptionModalOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" role="dialog" aria-modal="true" aria-labelledby="subscription-modal-title">
      <div className="bg-white dark:bg-slate-900 dark:text-white rounded-2xl max-w-md w-full p-6 space-y-4">
        <h2 id="subscription-modal-title" className="text-xl font-bold">Mejorar a Ceroa Plus</h2>
        <p className="text-sm">Cero permite registrar un máximo de 2 deudas. Ceroa Plus amplía tus capacidades financieras. Consulta la oferta vigente antes de continuar.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => { setIsSubscriptionModalOpen(false); setCurrentScreen('subscription'); }} className="rounded-lg bg-teal-700 text-white px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2">Ver planes</button>
          <button type="button" onClick={() => setIsSubscriptionModalOpen(false)} className="rounded-lg border px-4 py-2 focus-visible:outline-2 focus-visible:outline-offset-2">Cerrar</button>
        </div>
      </div>
    </div>
  );
};
