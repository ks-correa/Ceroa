import React from 'react';
import {
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppScreen } from '../../types';
import { CeroaLogo } from '../common/CeroaLogo';
import { isNavigationItemActive, MAIN_NAVIGATION_ITEMS } from './navigation';

export const Sidebar: React.FC = () => {
  const { 
    currentScreen, 
    setCurrentScreen, 
    handleLogout,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    userProfile
  } = useApp();

  const handleNavigate = (screen: AppScreen) => {
    setCurrentScreen(screen);
    setIsMobileSidebarOpen(false);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP LATERAL SIDEBAR (Left side for computer screens)               */}
      {/* ========================================================================= */}
      <aside 
        id="desktop-sidebar"
        className={`hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 fixed inset-y-0 left-0 z-30 select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header with Hamburger / Collapse Toggle */}
        <div className={`p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center ${
          isSidebarCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'
        }`}>
          <div 
            onClick={() => handleNavigate('dashboard')} 
            className="cursor-pointer overflow-hidden transition-transform hover:opacity-95"
            title="Ceroa - Inicio"
          >
            {isSidebarCollapsed ? (
              <CeroaLogo size="md" showText={false} />
            ) : (
              <CeroaLogo size="md" subtitle="Gestión de Deuda" />
            )}
          </div>

          {/* Hamburger toggle button in Sidebar */}
          <button
            id="sidebar-toggle-btn"
            onClick={toggleSidebarCollapse}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-label={isSidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-[var(--ceroa-primary)] dark:text-cyan-400" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-500 hover:text-[var(--ceroa-primary)]" />
            )}
          </button>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {MAIN_NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isNavigationItemActive(item.id, currentScreen);

            return (
              <div key={item.id} className="relative group">
                <button
                  id={`desktop-nav-link-${item.id}`}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                    isSidebarCollapsed ? 'justify-center p-3' : 'gap-3.5 px-3.5 py-2.5'
                  } ${
                    isActive
                      ? 'bg-[var(--ceroa-primary)] text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-[var(--ceroa-primary)]'}`} />
                  
                  {!isSidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="truncate">{item.label}</span>
                    </div>
                  )}
                </button>

                {/* Tooltip on Collapsed Sidebar Hover */}
                {isSidebarCollapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none">
                    <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-slate-700">
                      {item.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        </div>

        {/* Bottom Actions Area */}
        <div className={`p-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1 ${
          isSidebarCollapsed ? 'flex flex-col items-center' : ''
        }`}>
          {/* Logout */}
          <div className="w-full relative group">
            <button
              id="sidebar-logout-btn"
              onClick={handleLogout}
              className={`w-full flex items-center rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer ${
                isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'
              }`}
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 text-rose-500 flex-shrink-0" />
              {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
            </button>
            {isSidebarCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-slate-700">
                  Cerrar Sesión
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE / TABLET SLIDE-OVER DRAWER (When hamburger is clicked on mobile) */}
      {/* ========================================================================= */}
      {isMobileSidebarOpen && (
        <div 
          id="mobile-sidebar-drawer-container"
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          {/* Dark Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Lateral Drawer Content */}
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-200/80 dark:border-slate-800 z-10 animate-in slide-in-from-left duration-200">
            
            {/* Header with Brand & Close Button */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <CeroaLogo 
                size="sm" 
                subtitle="Gestión de Deuda" 
                onClick={() => handleNavigate('dashboard')} 
              />
              <button
                id="close-mobile-sidebar-btn"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Cerrar menú lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Mini Header */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={userProfile.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight truncate max-w-[120px]">
                    {userProfile.fullName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {userProfile.plan === 'plus' ? 'Ceroa Plus' : 'Plan Cero'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleNavigate('subscription')}
                className="p-1 rounded-lg text-[var(--ceroa-primary)] dark:text-cyan-400 hover:bg-[var(--ceroa-primary)]/10"
                title="Ver Suscripción"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              <span className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                Navegación
              </span>
              {MAIN_NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = isNavigationItemActive(item.id, currentScreen);

                return (
                  <button
                    key={item.id}
                    id={`drawer-nav-${item.id}`}
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
                      isActive
                        ? 'bg-[var(--ceroa-primary)] text-white shadow-xs font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 opacity-50 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}

            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-1 bg-slate-50/50 dark:bg-slate-900">
              <button
                onClick={() => {
                  setIsMobileSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
