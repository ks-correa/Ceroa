import React from 'react';
import { 
  Bell, 
  ChevronRight, 
  ArrowLeft, 
  Moon, 
  Sun,
  ShieldCheck,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CeroaLogo } from '../common/CeroaLogo';

const CURRENCY_LABELS = {
  COP: 'COP ($)',
  MXN: 'MXN ($)',
  USD: 'USD ($)'
} as const;

export const TopHeader: React.FC = () => {
  const { 
    currentScreen, 
    setCurrentScreen, 
    userProfile, 
    preferences, 
    handleUpdatePreferences,
    unreadNotificationsCount,
    setIsNotificationsOpen,
    selectedDebtId,
    debts,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    setIsMobileSidebarOpen
  } = useApp();

  const selectedDebt = debts.find((d) => d.id === selectedDebtId);

  // Dynamic breadcrumb or title
  const renderBreadcrumb = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Finanzas</span>
          </div>
        );
      case 'debts':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Mis Deudas</span>
          </div>
        );
      case 'debt_detail':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <button 
              onClick={() => setCurrentScreen('debts')} 
              className="hover:text-[var(--ceroa-primary)] dark:hover:text-cyan-400 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Deudas
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[180px]">
              {selectedDebt ? selectedDebt.name : 'Detalle'}
            </span>
          </div>
        );
      case 'strategy':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Estrategia de Pago</span>
          </div>
        );
      case 'simulation':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Simular</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Proyección</span>
          </div>
        );
      case 'calendar':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Vencimientos</span>
          </div>
        );
      case 'subscription':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Plataforma</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Suscripción</span>
          </div>
        );
      case 'profile':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Cuenta</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-900 dark:text-white font-semibold">Perfil</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <header 
      id="app-top-header"
      className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between transition-colors"
    >
      {/* Left Area: Hamburger button + Mobile logo / Back button / Desktop breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Desktop Hamburger / Sidebar Collapse Button */}
        <button
          id="desktop-header-hamburger-btn"
          onClick={toggleSidebarCollapse}
          className="hidden lg:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--ceroa-primary)] dark:hover:text-cyan-400 transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-label="Alternar barra lateral"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        {/* Mobile Hamburger & Logo/Back Button */}
        <div className="lg:hidden flex items-center gap-1.5">
          <button
            id="mobile-header-hamburger-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--ceroa-primary)] transition-colors"
            title="Abrir menú de páginas"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>

          {currentScreen === 'debt_detail' ? (
            <button
              id="mobile-back-to-debts"
              onClick={() => setCurrentScreen('debts')}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <CeroaLogo size="sm" onClick={() => setCurrentScreen('dashboard')} />
          )}
        </div>

        {/* Desktop Breadcrumbs */}
        <div className="hidden lg:block ml-1">
          {renderBreadcrumb()}
        </div>
      </div>

      {/* Right Area: Currency selector, Dark mode toggle, Notification bell, User avatar */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Currency Switcher */}
        <div id="currency-indicator" aria-label={`Moneda: ${preferences.currency}`} className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <span className="hidden sm:inline text-slate-500 dark:text-slate-400 font-medium">Moneda:</span>
          <span className="text-slate-800 dark:text-slate-200 font-semibold">{CURRENCY_LABELS[preferences.currency]}</span>
        </div>

        {/* Theme quick toggle */}
        <button
          id="theme-quick-toggle"
          onClick={() => handleUpdatePreferences({ darkMode: !preferences.darkMode })}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={preferences.darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {preferences.darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notifications trigger */}
        <button
          id="notifications-bell-btn"
          onClick={() => setIsNotificationsOpen(true)}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Notificaciones"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          )}
        </button>

        {/* Plan badge (Desktop) */}
        <button
          onClick={() => setCurrentScreen('subscription')}
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--ceroa-primary)]/10 dark:bg-cyan-950/80 text-[var(--ceroa-primary)] dark:text-cyan-400 border border-[var(--ceroa-primary)]/20 hover:bg-[var(--ceroa-primary)]/20 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{userProfile.plan === 'plus' ? 'Ceroa Plus' : 'Plan Cero'}</span>
        </button>

        {/* User avatar / profile trigger */}
        <button
          id="topbar-user-profile-btn"
          onClick={() => setCurrentScreen('profile')}
          className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-[var(--ceroa-primary)]/30 transition-all cursor-pointer"
        >
          <img
            src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={userProfile.fullName}
            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
          />
        </button>
      </div>
    </header>
  );
};
