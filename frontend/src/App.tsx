import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { BottomNav } from './components/layout/BottomNav';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';

// Auth views
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';

// Main views
import { DashboardView } from './components/dashboard/DashboardView';
import { DebtsListView } from './components/debts/DebtsListView';
import { DebtDetailView } from './components/debts/DebtDetailView';
import { StrategicPlanView } from './components/plan/StrategicPlanView';
import { SimulationView } from './components/simulation/SimulationView';
import { CalendarView } from './components/calendar/CalendarView';
import { ProfileView } from './components/profile/ProfileView';
import { SubscriptionView } from './components/subscription/SubscriptionView';

// Modals
import { AddDebtModal } from './components/modals/AddDebtModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { EditFinancialProfileModal } from './components/modals/EditFinancialProfileModal';
import { EditProfileModal } from './components/modals/EditProfileModal';
import { ExportReportModal } from './components/modals/ExportReportModal';
import { SubscriptionCheckoutModal } from './components/modals/SubscriptionCheckoutModal';

const AppContent: React.FC = () => {
  const { currentScreen, isAuthenticated, isAuthChecking, isSidebarCollapsed, isLoading, dataError, refreshAllData } = useApp();

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center" role="status">
        <div className="w-9 h-9 rounded-full border-4 border-slate-200 border-t-[#008FA6] animate-spin" />
      </div>
    );
  }

  // If user is not logged in, show Auth views
  if (!isAuthenticated) {
    if (currentScreen === 'register') {
      return <RegisterView />;
    }
    return <LoginView />;
  }

  // Render view depending on screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return <DashboardView />;
      case 'debts':
        return <DebtsListView />;
      case 'debt_detail':
        return <DebtDetailView />;
      case 'strategy':
        return <StrategicPlanView />;
      case 'simulation':
        return <SimulationView />;
      case 'calendar':
        return <CalendarView />;
      case 'profile':
        return <ProfileView />;
      case 'subscription':
        return <SubscriptionView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      
      {/* Desktop & Mobile Lateral Sidebar (Left Navigation) */}
      <Sidebar />

      {/* Main Content Area (Smoothly adjusts padding based on sidebar collapsed state on desktop) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
        isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        
        {/* Top App Header */}
        <TopHeader />

        {/* Dynamic Screen View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {isLoading ? (
            <div role="status" className="max-w-xl mx-auto mt-16 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
              <div className="w-8 h-8 mx-auto rounded-full border-4 border-slate-200 border-t-[#008FA6] animate-spin" />
              <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Cargando tu información financiera...</p>
            </div>
          ) : dataError ? (
            <div role="alert" className="max-w-xl mx-auto mt-16 rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-8 text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">No pudimos cargar tus datos</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{dataError}</p>
              <button onClick={refreshAllData} className="mt-5 px-5 py-2.5 rounded-xl bg-[#008FA6] text-white text-sm font-bold">
                Reintentar
              </button>
            </div>
          ) : renderScreen()}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Visible on mobile/tablet) */}
      <BottomNav />

      {/* Sliding Notifications Drawer */}
      <NotificationsDrawer />

      {/* Interactive Global Modals */}
      <AddDebtModal />
      <RecordPaymentModal />
      <EditFinancialProfileModal />
      <EditProfileModal />
      <ExportReportModal />
      <SubscriptionCheckoutModal />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
