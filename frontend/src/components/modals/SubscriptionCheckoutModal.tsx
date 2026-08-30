import React, { useState } from 'react';
import { X, Sparkles, CreditCard, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SubscriptionCheckoutModal: React.FC = () => {
  const { 
    isSubscriptionModalOpen, 
    setIsSubscriptionModalOpen, 
    handleUpgradePlan, 
    userProfile,
    formatCurrency 
  } = useApp();

  const [cycle, setCycle] = useState<'monthly' | 'annual'>('annual');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isSubscriptionModalOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(async () => {
      await handleUpgradePlan('plus', cycle);
      setIsProcessing(false);
      setIsSubscriptionModalOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mejorar a Ceroa Plus ★
              </h3>
              <p className="text-xs text-slate-500">Desbloquea simulaciones y deudas ilimitadas</p>
            </div>
          </div>
          <button
            onClick={() => setIsSubscriptionModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="mt-5 space-y-4">
          
          {/* Plan Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setCycle('annual')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                cycle === 'annual'
                  ? 'border-teal-600 dark:border-cyan-400 bg-teal-50/40 dark:bg-cyan-950/30 ring-2 ring-teal-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Anual</span>
                <span className="text-[10px] font-extrabold bg-cyan-400 text-teal-950 px-1.5 py-0.5 rounded-md">-20%</span>
              </div>
              <div className="text-sm font-extrabold text-teal-900 dark:text-cyan-300 mt-1">
                $14.900 <span className="text-[10px] font-normal text-slate-400">/mes</span>
              </div>
              <span className="text-[10px] text-slate-400 block">$178.800 COP / año</span>
            </div>

            <div
              onClick={() => setCycle('monthly')}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                cycle === 'monthly'
                  ? 'border-teal-600 dark:border-cyan-400 bg-teal-50/40 dark:bg-cyan-950/30 ring-2 ring-teal-500/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850'
              }`}
            >
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Mensual</span>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                $19.900 <span className="text-[10px] font-normal text-slate-400">/mes</span>
              </div>
              <span className="text-[10px] text-slate-400 block">Facturación mensual</span>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Método de Pago
            </label>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{cardNumber}</span>
              </div>
              <span className="text-[10px] text-slate-400">Exp 12/26</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{cycle === 'annual' ? '$178.800 COP' : '$19.900 COP'}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Garantía de reembolso:</span>
              <span>14 días</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-800 hover:bg-teal-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Procesando pago seguro...' : 'Confirmar Suscripción'}</span>
            </button>
            <span className="text-[10px] text-slate-400 text-center block mt-2">
              Pago 100% seguro y encriptado con tecnología bancaria.
            </span>
          </div>

        </form>

      </div>
    </div>
  );
};
