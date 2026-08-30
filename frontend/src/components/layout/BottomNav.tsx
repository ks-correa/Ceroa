import React from 'react';
import { useApp } from '../../context/AppContext';
import { isNavigationItemActive, MAIN_NAVIGATION_ITEMS } from './navigation';

export const BottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useApp();

  return (
    <nav 
      id="mobile-bottom-navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 z-40 px-2 py-2 safe-area-pb"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {MAIN_NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationItemActive(item.id, currentScreen);

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
                  ? 'text-[var(--ceroa-primary)] dark:text-cyan-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[var(--ceroa-primary-light)] dark:bg-cyan-950/60 text-[var(--ceroa-primary)] dark:text-cyan-300 scale-105'
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
