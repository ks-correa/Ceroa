import React, { useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { AsyncModals } from './components/modals/AsyncModals';
import { ContentErrorState, ContentLoadingState, FullPageLoadingState } from './components/common/AsyncState';
import { AppScreenRouter } from './components/layout/AppScreenRouter';
import { BottomNav } from './components/layout/BottomNav';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';
import { MobileOnboarding } from './components/onboarding/MobileOnboarding';
import { useMobileOnboarding } from './components/onboarding/useMobileOnboarding';
import { ExternalRegistrationView } from './components/auth/ExternalRegistrationView';
import { AuthLayout } from './components/auth/AuthLayout';
import { RecoveryView } from './components/auth/RecoveryView';
import { InitialSetupWizard } from './components/onboarding/InitialSetupWizard';
import { subscriptionService } from './services/subscriptionService';
import type { PlanAccess } from './services/planService';
import { AssistantFab } from './components/assistant/AssistantFab';

const AppContent: React.FC = () => {
  const {
    currentScreen,
    userProfile,
    isAuthenticated,
    isAuthChecking,
    isSidebarCollapsed,
    isLoading,
    dataError,
    planAccess, setCurrentScreen,
    refreshAllData, handleLogout, logoutPending, logoutError
  } = useApp();
  const { isOpen: isOnboardingOpen, dismiss: dismissOnboarding } = useMobileOnboarding();
  const [plusOfferOpen, setPlusOfferOpen] = useState(false);
  const closeOfferButton = useRef<HTMLButtonElement>(null);
  const [plusCatalog, setPlusCatalog] = useState<PlanAccess | null>(null);
  useEffect(() => { if (plusOfferOpen) void subscriptionService.capabilities().then(setPlusCatalog).catch(() => setPlusCatalog(null)); }, [plusOfferOpen]);
  useEffect(() => {
    if (!plusOfferOpen) return;
    closeOfferButton.current?.focus();
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { sessionStorage.removeItem('ceroa-plus-offer'); setPlusOfferOpen(false); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [plusOfferOpen]);
  useEffect(() => {
    const show = () => { if (sessionStorage.getItem('ceroa-plus-offer') === '1') setPlusOfferOpen(true); };
    window.addEventListener('ceroa:plus-offer', show);
    if (isAuthenticated && userProfile.initialSetupComplete && sessionStorage.getItem('ceroa-plus-return') === '1') {
      sessionStorage.removeItem('ceroa-plus-return'); setCurrentScreen('subscription');
    }
    return () => window.removeEventListener('ceroa:plus-offer', show);
  }, [setCurrentScreen, isAuthenticated, userProfile.initialSetupComplete]);
  const closePlusOffer = () => { sessionStorage.removeItem('ceroa-plus-offer'); setPlusOfferOpen(false); };

  if (isAuthChecking) return <FullPageLoadingState />;
  if (logoutPending) return <AuthLayout title="Cerrar sesión">
    <p role={logoutError ? 'alert' : 'status'}>{logoutError || 'Cerrando tu sesión de forma segura…'}</p>
    {logoutError && <button className="mt-4 underline" onClick={() => void handleLogout()}>Reintentar cierre de sesión</button>}
  </AuthLayout>;

  if (!isAuthenticated) {
    if (new URLSearchParams(location.search).get('auth') === 'complete') return <ExternalRegistrationView />;
    return (
      <>
        <div inert={isOnboardingOpen ? true : undefined} aria-hidden={isOnboardingOpen || undefined}>
          {currentScreen === 'register' ? <RegisterView /> : currentScreen === 'recovery' ? <RecoveryView /> : <LoginView />}
        </div>
        <MobileOnboarding open={isOnboardingOpen} onDismiss={dismissOnboarding} />
      </>
    );
  }

  if (!userProfile.initialSetupComplete) {
    return (
      <>
        <InitialSetupWizard />
        <AsyncModals />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <TopHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {isLoading
            ? <ContentLoadingState />
            : dataError
              ? <ContentErrorState message={dataError} onRetry={refreshAllData} />
              : <AppScreenRouter />}
        </main>
      </div>
      <BottomNav />
      <AssistantFab key={userProfile.id} />
      <NotificationsDrawer />
      <AsyncModals />
      {plusOfferOpen && !planAccess?.plusActive && <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="plus-offer-title">
        <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
          <button ref={closeOfferButton} type="button" aria-label="Cerrar oferta" onClick={closePlusOffer} className="float-right text-xl focus-visible:outline-2">×</button>
          <h2 id="plus-offer-title" className="text-xl font-bold">Conoce Ceroa Plus</h2>
          {plusCatalog ? <ul className="list-disc pl-5">{plusCatalog.limits.maxDetailedDebts === null && <li>Deudas sin límite de 2</li>}{plusCatalog.capabilities.fullStrategyDetail && <li>Detalle completo de estrategias</li>}{plusCatalog.capabilities.simulation && <li>Simular</li>}{plusCatalog.capabilities.advancedReminders && <li>Recordatorios y alertas avanzados</li>}{plusCatalog.capabilities.detailedMonthlySummary && <li>Resumen mensual detallado</li>}</ul> : <p role="status">Cargando beneficios…</p>}
          <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { closePlusOffer(); setCurrentScreen('subscription'); }} className="rounded-lg bg-teal-700 px-4 py-2 text-white focus-visible:outline-2">Mejorar a Plus</button><button type="button" onClick={closePlusOffer} className="rounded-lg border px-4 py-2 focus-visible:outline-2">Continuar con Cero</button></div>
        </div>
      </div>}
    </div>
  );
};

export default function App() {
  return <AppProvider><AppContent /></AppProvider>;
}
