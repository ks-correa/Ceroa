import React from 'react';
import { LayoutDashboard, CreditCard, ClipboardList, Zap, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppScreen } from '../../types';

export const BottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();

  const navItems: { id: AppScreen; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'debts', label: 'Deudas', icon: CreditCard },
    { id: 'strategy', label: 'Estrategia', icon: ClipboardList },
    { id: 'simulation', label: 'Simular', icon: Zap },
    { id: 'profile', label: 'Perfil', icon: User }
  ];

  return (
    <nav 
      id="mobile-bottom-navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 z-40 px-2 py-2 safe-area-pb"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id || (item.id === 'debts' && currentScreen === 'debt_detail');

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => {
                setCurrentScreen(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 min-w-[58px] cursor-pointer ${
                isActive
                  ? 'text-[#008FA6] dark:text-cyan-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#E0F7FA] dark:bg-cyan-950/60 text-[#008FA6] dark:text-cyan-300 scale-105' 
                  : 'bg-transparent'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 font-medium tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
