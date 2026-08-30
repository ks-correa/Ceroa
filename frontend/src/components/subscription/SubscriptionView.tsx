import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Sparkles,
  RotateCcw, 
  Headphones, 
  ArrowRight, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SubscriptionView: React.FC = () => {
  const { 
    userProfile, 
    handleUpgradePlan, 
    setIsSubscriptionModalOpen
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const isCurrentPlus = userProfile.plan === 'plus';

  const handleSelectPlus = () => {
    setIsSubscriptionModalOpen(true);
  };

  const handleSelectCero = () => {
    handleUpgradePlan('cero', 'monthly');
  };

  return (
    <div className="space-y-8 pb-24 lg:pb-12 max-w-5xl mx-auto">
      
      {/* Header (Page 10 & 13 of PDF) */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-cyan-400">
          Suscripción
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Elige el plan ideal para tu <br className="hidden sm:inline" />
          <span className="text-[var(--ceroa-primary)] dark:text-cyan-400">libertad financiera</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Toma el control de tus deudas con herramientas diseñadas para acelerar tus pagos y reducir intereses de forma inteligente.
        </p>

        {/* Billing Switcher (Page 10 & 13) */}
        <div className="pt-4 flex justify-center">
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              id="billing-monthly-btn"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Mensual
            </button>

            <button
              id="billing-annual-btn"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-[var(--ceroa-primary)] text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <span>Anual</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#00E5FF] text-teal-950">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        
        {/* Card 1: Plan Cero (Gratis) */}
        <div className={`bg-white dark:bg-slate-900 border rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
          !isCurrentPlus 
            ? 'border-slate-300 dark:border-slate-700 shadow-sm ring-2 ring-slate-400/20' 
            : 'border-slate-200/80 dark:border-slate-800 opacity-90'
        }`}>
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Plan Básico
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  Cero
                </h3>
              </div>

              {!isCurrentPlus && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Tu plan actual
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Para quienes inician su camino hacia la organización financiera básica.
            </p>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                $0 <span className="text-xs font-medium text-slate-400">COP / mes</span>
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Gratis para siempre
              </span>
            </div>

            {/* Feature List */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Registro de hasta 2 deudas</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Panel financiero y saldos</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Registro de pagos y recordatorios</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Estrategia básica Bola de Nieve</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400 line-through">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Método Avalancha avanzado</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400 line-through">
                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                <span>Simulador avanzado de pagos extra</span>
              </div>
            </div>

          </div>

          <div className="pt-8">
            <button
              onClick={handleSelectCero}
              disabled={!isCurrentPlus}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                !isCurrentPlus
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                  : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer'
              }`}
            >
              {!isCurrentPlus ? 'Plan Activo' : 'Cambiar a Plan Cero'}
            </button>
          </div>
        </div>

        {/* Card 2: Ceroa Plus (Recomendado) */}
        <div className={`bg-white dark:bg-slate-900 border-2 border-[var(--ceroa-primary)] rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden ring-4 ring-[var(--ceroa-primary)]/10`}>
          
          {/* Top Pill Tag */}
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-[var(--ceroa-primary)] text-white shadow-xs">
              Recomendado
            </span>
          </div>

          <div className="space-y-6">
            
            <div>
              <span className="text-xs font-bold text-[var(--ceroa-primary)] dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                PREMIUM
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                Ceroa Plus <span className="text-amber-400">★</span>
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Herramientas avanzadas con algoritmos financieros para salir de deudas en tiempo récord.
            </p>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-3xl sm:text-4xl font-extrabold text-[var(--ceroa-primary)] dark:text-cyan-300">
                {billingCycle === 'annual' ? '$14.900' : '$19.900'} <span className="text-xs font-medium text-slate-400">COP / mes</span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                {billingCycle === 'annual' ? 'Facturado anualmente ($178.800 COP)' : 'Facturado mes a mes'}
              </span>
            </div>

            {/* Feature List */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--ceroa-primary)] flex-shrink-0" />
                <span><strong>Deudas ilimitadas</strong> en portafolio</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--ceroa-primary)] flex-shrink-0" />
                <span>Algoritmos <strong>Avalancha y Bola de Nieve</strong></span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--ceroa-primary)] flex-shrink-0" />
                <span>Estrategia de pago personalizada</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--ceroa-primary)] flex-shrink-0" />
                <span>Simulador interactivo de pagos extraordinarios</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--ceroa-primary)] flex-shrink-0" />
                <span>Alertas inteligentes de vencimiento y refinanciamiento</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--ceroa-primary)] flex-shrink-0" />
                <span>Resumen de progreso y exportación en PDF</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[var(--ceroa-primary)] flex-shrink-0" />
                <span>Soporte prioritario financiero</span>
              </div>
            </div>

          </div>

          <div className="pt-8">
            <button
              id="upgrade-to-plus-btn"
              onClick={handleSelectPlus}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <span>{isCurrentPlus ? 'Gestionar Plan Plus' : 'Mejorar a Ceroa Plus'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-400 text-center block mt-2">
              Cancela en cualquier momento. Sin cargos ocultos.
            </span>
          </div>

        </div>

      </div>

      {/* Trust & Guarantee Cards Footer (Page 13 of PDF) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
        
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Seguridad Bancaria
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Tus datos están encriptados con los más altos estándares y nunca los compartiremos con terceros.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Cancela cuando quieras
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Sin compromisos ni cláusulas de permanencia. Gestiona tu suscripción con un solo clic.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 flex items-center justify-center">
            <Headphones className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Soporte Dedicado
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Ayuda experta de nuestro equipo para guiarte en tu camino a salir de deudas.
          </p>
        </div>

      </div>

    </div>
  );
};
