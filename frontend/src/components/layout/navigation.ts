import { ClipboardList, CreditCard, LayoutDashboard, User, Zap } from 'lucide-react';
import { AppScreen } from '../../types';

export const MAIN_NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'debts', label: 'Deudas', icon: CreditCard },
  { id: 'strategy', label: 'Estrategia', icon: ClipboardList },
  { id: 'simulation', label: 'Simular', icon: Zap },
  { id: 'profile', label: 'Perfil', icon: User }
] as const satisfies ReadonlyArray<{
  id: AppScreen;
  label: string;
  icon: typeof LayoutDashboard;
}>;

const SECONDARY_SCREEN_PARENT: Partial<Record<AppScreen, AppScreen>> = {
  calendar: 'dashboard',
  debt_detail: 'debts',
  subscription: 'profile'
};

export const isNavigationItemActive = (
  itemId: AppScreen,
  currentScreen: AppScreen
): boolean => itemId === currentScreen || SECONDARY_SCREEN_PARENT[currentScreen] === itemId;
