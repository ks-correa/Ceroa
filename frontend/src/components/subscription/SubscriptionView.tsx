import React from 'react';
import { useApp } from '../../context/AppContext';

export const SubscriptionView: React.FC = () => {
  const { planAccess, setCurrentScreen } = useApp();
  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button type="button" onClick={() => setCurrentScreen('profile')} className="text-sm font-semibold text-teal-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500">
        Volver a Perfil
      </button>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Planes Cero y Ceroa Plus</h1>
      <p className="text-slate-600 dark:text-slate-300">Plan vigente: {planAccess?.plusActive ? 'Ceroa Plus activo' : 'Cero'}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-bold">Cero</h2>
          <ul className="list-disc pl-5 mt-3 space-y-2 text-sm">
            <li>Máximo 2 deudas registradas</li><li>Registro y gestión de pagos</li><li>Dashboard básico</li>
            <li>Bola de Nieve y Avalancha</li><li>Detalle básico de estrategia</li>
          </ul>
        </section>
        <section className="rounded-2xl border border-teal-500 p-6">
          <h2 className="text-xl font-bold">Ceroa Plus</h2>
          <ul className="list-disc pl-5 mt-3 space-y-2 text-sm">
            <li>Deudas ilimitadas</li><li>Bola de Nieve y Avalancha</li><li>Detalle completo de estrategias</li>
            <li>Simular</li><li>Recordatorios y alertas avanzados</li><li>Resumen mensual detallado</li>
          </ul>
        </section>
      </div>
      {!planAccess?.plusActive && <p className="text-sm text-slate-600 dark:text-slate-300" role="status">La contratación de Ceroa Plus estará disponible próximamente.</p>}
    </main>
  );
};
