import { useCallback, useState } from 'react';
import { AppScreen } from '../types';

const SIDEBAR_STORAGE_KEY = 'ceroa_sidebar_collapsed';

const readSidebarPreference = (): boolean => {
  try {
    return JSON.parse(localStorage.getItem(SIDEBAR_STORAGE_KEY) || 'false') === true;
  } catch {
    return false;
  }
};

export const useLayoutState = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readSidebarPreference);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((collapsed) => {
      const nextValue = !collapsed;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(nextValue));
      } catch {
        // The preference is non-essential when storage is unavailable.
      }
      return nextValue;
    });
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((open) => !open);
  }, []);

  return {
    currentScreen,
    setCurrentScreen,
    selectedDebtId,
    setSelectedDebtId,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebarCollapse,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    toggleMobileSidebar
  };
};
