import React, { useState, useEffect } from 'react';
import { DollarSign, Hash, Landmark, Target, CheckCircle2, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { userService } from '../../services/userService';
import { FinancialProfile, StrategyType } from '../../types';
import { FinancialSituationStep } from './steps/FinancialSituationStep';
import { TotalDeclaredDebtsStep } from './steps/TotalDeclaredDebtsStep';
import { RegisterDebtsStep } from './steps/RegisterDebtsStep';
import { SelectStrategyStep } from './steps/SelectStrategyStep';
import { ReviewStep } from './steps/ReviewStep';
import { ContentLoadingState } from '../common/AsyncState';

const STEPS = [
  { id: 'financial_situation', label: 'Situación Financiera', icon: DollarSign },
  { id: 'total_declared', label: 'Cantidad de Deudas', icon: Hash },
  { id: 'register_debts', label: 'Registrar Deudas', icon: Landmark },
  { id: 'select_strategy', label: 'Estrategia', icon: Target },
  { id: 'review_finalize', label: 'Revisión y Finalizar', icon: CheckCircle2 }
];

export const InitialSetupWizard: React.FC = () => {
  const { userProfile, debts, financialProfile: contextProfile, refreshAllData, handleLogout } = useApp();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>(contextProfile);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadBackendState = async () => {
    try {
      setFetchError(null);
      const profile = await userService.getFinancialProfile();
      setFinancialProfile(profile);
    } catch (cause) {
      // Keep existing context profile if fetch fails, unless completely empty
      if (!financialProfile) {
        setFetchError(cause instanceof Error ? cause.message : 'Error al cargar tu configuración inicial.');
      }
    }
  };

  useEffect(() => {
    void loadBackendState();
  }, []);


  if (loading) return <ContentLoadingState />;

  if (fetchError || !financialProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full space-y-4 text-center">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-bold">{fetchError || 'Error inesperado'}</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => void loadBackendState()}
              className="px-4 py-2 text-xs font-bold text-white bg-[var(--ceroa-primary)] rounded-xl"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 underline"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveFinancialSituation = async (data: { monthlyIncome: number; fixedExpenses: number; availableMoney: number }) => {
    setSaving(true);
    try {
      const updated = await userService.updateFinancialProfile({
        monthlyIncome: data.monthlyIncome,
        fixedExpenses: data.fixedExpenses,
        availableMoney: data.availableMoney,
        totalDeclaredDebts: financialProfile.totalDeclaredDebts || 1,
        activeStrategy: financialProfile.activeStrategy || 'snowball'
      });
      setFinancialProfile(updated);
      setCurrentStep(1);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeclaredDebts = async (declaredCount: number) => {
    setSaving(true);
    try {
      const updated = await userService.updateFinancialProfile({
        monthlyIncome: financialProfile.monthlyIncome,
        fixedExpenses: financialProfile.fixedExpenses,
        availableMoney: financialProfile.availableMoney,
        totalDeclaredDebts: declaredCount,
        activeStrategy: financialProfile.activeStrategy || 'snowball'
      });
      setFinancialProfile(updated);
      setCurrentStep(2);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStrategy = async (strategy: StrategyType) => {
    setSaving(true);
    try {
      const updated = await userService.updateStrategy(strategy);
      setFinancialProfile(updated);
      setCurrentStep(4);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSetup = async () => {
    setSaving(true);
    try {
      await userService.completeInitialSetup();
      await refreshAllData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--ceroa-primary)] flex items-center justify-center text-white font-extrabold text-sm">
              C
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">Ceroa — Configuración Financiera</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Paso {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].label}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Stepper Progress Bar */}
      <div className="bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 py-3 px-4 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between min-w-[500px]">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-teal-600 text-white'
                    : isCurrent
                    ? 'bg-[var(--ceroa-primary)] text-white ring-4 ring-teal-500/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${
                  isCurrent ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {step.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors ${
                    idx < currentStep ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {currentStep === 0 && (
          <FinancialSituationStep
            initialProfile={financialProfile}
            onSave={handleSaveFinancialSituation}
            isSaving={saving}
          />
        )}

        {currentStep === 1 && (
          <TotalDeclaredDebtsStep
            initialDeclaredDebts={financialProfile.totalDeclaredDebts || 1}
            userPlan={userProfile.plan}
            onSave={handleSaveDeclaredDebts}
            onBack={() => setCurrentStep(0)}
            isSaving={saving}
          />
        )}

        {currentStep === 2 && (
          <RegisterDebtsStep
            debts={debts}
            totalDeclaredDebts={financialProfile.totalDeclaredDebts || 1}
            userPlan={userProfile.plan}
            onNext={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <SelectStrategyStep
            initialStrategy={financialProfile.activeStrategy || 'snowball'}
            onSave={handleSaveStrategy}
            onBack={() => setCurrentStep(2)}
            isSaving={saving}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep
            financialProfile={financialProfile}
            debts={debts}
            onComplete={handleCompleteSetup}
            onGoToStep={(stepIdx) => setCurrentStep(stepIdx)}
            onBack={() => setCurrentStep(3)}
            isSubmitting={saving}
          />
        )}
      </main>
    </div>
  );
};
