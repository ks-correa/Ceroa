import React from 'react';
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

const AppContent: React.FC = () => {
  const {
    currentScreen,
    isAuthenticated,
    isAuthChecking,
    isSidebarCollapsed,
    isLoading,
    dataError,
    refreshAllData
  } = useApp();
  const { isOpen: isOnboardingOpen, dismiss: dismissOnboarding } = useMobileOnboarding();

  if (isAuthChecking) return <FullPageLoadingState />;
  if (!isAuthenticated) {
    return (
      <>
        <div inert={isOnboardingOpen ? true : undefined} aria-hidden={isOnboardingOpen || undefined}>
          {currentScreen === 'register' ? <RegisterView /> : <LoginView />}
        </div>
        <MobileOnboarding open={isOnboardingOpen} onDismiss={dismissOnboarding} />
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
      <NotificationsDrawer />
      <AsyncModals />
    </div>
  );
};

export default function App() {
  return <AppProvider><AppContent /></AppProvider>;
}
