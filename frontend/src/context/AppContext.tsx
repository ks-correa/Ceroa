import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { 
  AppScreen, 
  CreateDebtPayload,
  CurrencyCode, 
  Debt, 
  FinancialProfile, 
  NotificationItem, 
  PaymentRecord, 
  StrategyType, 
  UserPreferences, 
  UserProfile,
  DashboardSummary,
  UpcomingDueItem
} from '../types';
import { debtService } from '../services/debtService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { dueService } from '../services/dueService';
import { authService, RegisterPayload } from '../services/authService';
import { dashboardService } from '../services/dashboardService';
import { strategyService } from '../services/strategyService';
import {
  DEFAULT_FINANCIAL_PROFILE,
  DEFAULT_PREFERENCES,
  DEFAULT_USER_PROFILE
} from '../constants/defaults';
import { calculateDebtSummary } from '../utils/financial';
import {
  formatCurrency as formatCurrencyValue,
  formatDate as formatDateValue,
  formatNumber as formatNumberValue
} from '../utils/formatters';
import { useLayoutState } from './useLayoutState';
import { useOverlayState } from './useOverlayState';
import { useToast } from '../hooks/useToast';
import { SESSION_EXPIRED_EVENT, invalidateSessionRequests } from '../services/api';
import { LocalStorageManager } from '../services/storage';
import { applyColorTheme } from '../utils/theme';

interface AppContextType {
  // Navigation & Screen
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
  logoutPending: boolean;
  logoutError: string;
  selectedDebtId: string | null;
  setSelectedDebtId: (id: string | null) => void;
  navigateToDebtDetail: (id: string) => void;

  // Sidebar controls
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebarCollapse: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobileSidebar: () => void;

  // Data & State
  debts: Debt[];
  payments: PaymentRecord[];
  userProfile: UserProfile;
  financialProfile: FinancialProfile;
  preferences: UserPreferences;
  notifications: NotificationItem[];
  upcomingDues: UpcomingDueItem[];
  unreadNotificationsCount: number;
  isLoading: boolean;
  dataError: string | null;

  // Dashboard (EP-08)
  dashboardSummary: DashboardSummary | null;
  isDashboardLoading: boolean;
  dashboardError: string | null;
  refreshDashboard: () => Promise<void>;

  // Strategy
  activeStrategy: StrategyType;
  setActiveStrategy: (strategy: StrategyType) => Promise<void>;

  // Financial Aggregates
  totalDebt: number;
  totalOriginalDebt: number;
  totalPaidSoFar: number;
  totalRecordedPayments: number;
  overallProgressPercentage: number;
  nextTotalMonthlyPayment: number;
  activeAccountsCount: number;

  // Formatting helpers
  formatCurrency: (amount: number, overrideCurrency?: CurrencyCode) => string;
  formatNumber: (amount: number) => string;
  formatDate: (date: string | undefined) => string;

  // Modals & Drawers
  isAddDebtOpen: boolean;
  setIsAddDebtOpen: (open: boolean) => void;
  openAddDebtModal: () => void;
  isRecordPaymentOpen: boolean;
  setIsRecordPaymentOpen: (open: boolean) => void;
  targetPaymentDebtId: string | null;
  setTargetPaymentDebtId: (id: string | null) => void;
  editingPayment: PaymentRecord | null;
  suggestedPaymentAmount: number | null;
  openRecordPaymentModal: (debtId?: string, payment?: PaymentRecord, suggestedAmount?: number) => void;
  editingDebtId: string | null;
  setEditingDebtId: (id: string | null) => void;
  openEditDebtModal: (debtId: string) => void;
  isEditFinancialOpen: boolean;
  setIsEditFinancialOpen: (open: boolean) => void;
  isEditProfileOpen: boolean;
  setIsEditProfileOpen: (open: boolean) => void;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  isExportReportOpen: boolean;
  setIsExportReportOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Actions
  refreshAllData: () => Promise<void>;
  handleAddDebt: (debt: CreateDebtPayload) => Promise<void>;
  handleUpdateDebt: (id: string, updates: Partial<Debt>) => Promise<void>;
  handleDeleteDebt: (id: string) => Promise<void>;
  handleRecordPayment: (payment: { debtId: string; amount: number; type: PaymentRecord['type']; notes?: string; date: string }) => Promise<void>;
  handleUpdatePayment: (id: string, payment: { debtId: string; amount: number; type: PaymentRecord['type']; notes?: string; date: string }) => Promise<void>;
  handleDeletePayment: (id: string) => Promise<void>;
  handleUpdateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  handleUpdateFinancialProfile: (updates: Partial<FinancialProfile>) => Promise<void>;
  handleUpdatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  handleUpgradePlan: (plan: 'cero' | 'plus', cycle: 'monthly' | 'annual') => Promise<void>;
  handleMarkNotificationRead: (id: string) => Promise<void>;
  handleMarkAllNotificationsRead: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleLogin: (email: string, password: string) => Promise<void>;
  handleRegister: (payload: RegisterPayload) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentScreen, setCurrentScreen, selectedDebtId, setSelectedDebtId,
    isSidebarCollapsed, setIsSidebarCollapsed, toggleSidebarCollapse,
    isMobileSidebarOpen, setIsMobileSidebarOpen, toggleMobileSidebar
  } = useLayoutState();
  const {
    isAddDebtOpen, setIsAddDebtOpen,
    isRecordPaymentOpen, setIsRecordPaymentOpen,
    targetPaymentDebtId, setTargetPaymentDebtId,
    editingPayment, setEditingPayment,
    suggestedPaymentAmount, setSuggestedPaymentAmount,
    editingDebtId, setEditingDebtId,
    isEditFinancialOpen, setIsEditFinancialOpen,
    isEditProfileOpen, setIsEditProfileOpen,
    isSubscriptionModalOpen, setIsSubscriptionModalOpen,
    isExportReportOpen, setIsExportReportOpen,
    isNotificationsOpen, setIsNotificationsOpen
  } = useOverlayState();
  const { toastMessage, showToast, clearToast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [logoutPending, setLogoutPending] = useState(() => localStorage.getItem('ceroa_logout_pending') === 'true');
  const [logoutError, setLogoutError] = useState('');
  const logoutInFlight = useRef(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Core Data
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>(DEFAULT_FINANCIAL_PROFILE);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    LocalStorageManager.initInterfaceData();
    return LocalStorageManager.get<UserPreferences>('preferences', DEFAULT_PREFERENCES);
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [upcomingDues, setUpcomingDues] = useState<UpcomingDueItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Strategy
  const [activeStrategy, setActiveStrategyState] = useState<StrategyType>('snowball');

  // Dashboard Summary (EP-08)
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const refreshRequestId = useRef(0);

  const refreshDashboard = useCallback(async () => {
    try {
      setIsDashboardLoading(true);
      setDashboardError(null);
      const summary = await dashboardService.getSummary();
      setDashboardSummary(summary);
    } catch (e) {
      console.error('Failed to load dashboard summary:', e);
      setDashboardError(e instanceof Error ? e.message : 'No fue posible cargar el resumen financiero.');
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  const clearAuthenticatedState = useCallback(() => {
    invalidateSessionRequests();
    clearToast();
    refreshRequestId.current += 1;
    setIsAuthenticated(false);
    setCurrentScreen('login');
    setSelectedDebtId(null);
    setDebts([]);
    setPayments([]);
    setUserProfile(DEFAULT_USER_PROFILE);
    setFinancialProfile(DEFAULT_FINANCIAL_PROFILE);
    setDashboardSummary(null);
    setIsDashboardLoading(false);
    setDashboardError(null);
    setNotifications([]);
    setUpcomingDues([]);
    setUnreadNotificationsCount(0);
    setActiveStrategyState('snowball');
    setDataError(null);
    setIsLoading(false);
    setIsAddDebtOpen(false);
    setIsRecordPaymentOpen(false);
    setIsEditFinancialOpen(false);
    setIsEditProfileOpen(false);
    setIsSubscriptionModalOpen(false);
    setIsExportReportOpen(false);
    setIsNotificationsOpen(false);
    setTargetPaymentDebtId(null);
    setEditingPayment(null);
    setSuggestedPaymentAmount(null);
    setEditingDebtId(null);
    setIsMobileSidebarOpen(false);
    LocalStorageManager.set('notifications', []);
    ['debts', 'payments', 'userProfile', 'financialProfile', 'token', 'password'].forEach(key => localStorage.removeItem('ceroa_' + key));
  }, [
    clearToast, setTargetPaymentDebtId, setEditingPayment, setSuggestedPaymentAmount, setEditingDebtId, setIsMobileSidebarOpen,
    setCurrentScreen,
    setIsAddDebtOpen,
    setIsEditFinancialOpen,
    setIsEditProfileOpen,
    setIsExportReportOpen,
    setIsNotificationsOpen,
    setIsRecordPaymentOpen,
    setIsSubscriptionModalOpen,
    setSelectedDebtId
  ]);

  useEffect(() => () => {
    refreshRequestId.current += 1;
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      clearAuthenticatedState();
      showToast('Tu sesión venció. Inicia sesión nuevamente.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [clearAuthenticatedState, showToast]);

  const refreshAllData = useCallback(async () => {
    const requestId = ++refreshRequestId.current;
    try {
      setIsLoading(true);
      setIsDashboardLoading(true);
      setDataError(null);
      setDashboardError(null);
      const [fDebts, fPayments, fUser, fFin, fPrefs, fNotifs, fDashboard, fDues] = await Promise.all([
        debtService.getDebts(),
        debtService.getPayments(),
        userService.getUserProfile(),
        userService.getFinancialProfile(),
        userService.getPreferences(),
        notificationService.getNotificationCenter().catch(() => notificationService.getNotifications()),
        dashboardService.getSummary().catch((err) => {
          console.error('Failed to fetch dashboard summary in refreshAllData:', err);
          return null;
        }),
        dueService.getUpcomingDues().catch((err) => {
          console.error('Failed to fetch upcoming dues in refreshAllData:', err);
          return [];
        })
      ]);

      if (requestId !== refreshRequestId.current) return;
      setDebts(fDebts);
      setPayments(fPayments);
      setUserProfile(fUser);
      setFinancialProfile(fFin);
      setActiveStrategyState(fFin.activeStrategy);
      setPreferences(fPrefs);
      if (Array.isArray(fNotifs)) {
        setNotifications(fNotifs);
        setUnreadNotificationsCount(fNotifs.filter((n: any) => !n.read).length);
      } else if (fNotifs && typeof fNotifs === 'object') {
        setNotifications(fNotifs.notifications || []);
        setUnreadNotificationsCount(Number(fNotifs.unreadCount || 0));
      }
      setUpcomingDues(fDues || []);
      if (fDashboard) {
        setDashboardSummary(fDashboard);
        setDashboardError(null);
      }
    } catch (e) {
      if (requestId !== refreshRequestId.current) return;
      console.error('Failed to load initial application data:', e);
      setDataError(e instanceof Error ? e.message : 'No fue posible cargar la información financiera.');
    } finally {
      if (requestId === refreshRequestId.current) {
        setIsLoading(false);
        setIsDashboardLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      if (localStorage.getItem('ceroa_logout_pending') === 'true') { setIsAuthChecking(false); setIsLoading(false); return; }
      const restoreId = refreshRequestId.current;
      try {
        const user = await authService.me();
        if (cancelled || restoreId !== refreshRequestId.current) return;
        setUserProfile(user);
        setIsAuthenticated(true);
        setCurrentScreen(user.initialSetupComplete ? 'dashboard' : 'initial_setup');
        if (user.initialSetupComplete) await refreshAllData(); else setIsLoading(false);
      } catch {
        if (cancelled) return;
        setIsAuthenticated(false);
        setCurrentScreen('login');
        setIsLoading(false);
      } finally {
        if (!cancelled) setIsAuthChecking(false);
      }
    };
    restoreSession();
    return () => { cancelled = true; };
  }, [refreshAllData]);

  // Handle dark mode class on html root
  useEffect(() => {
    applyColorTheme(preferences.darkMode);
  }, [preferences.darkMode]);

  // Navigation helper
  const navigateToDebtDetail = (id: string) => {
    setSelectedDebtId(id);
    setCurrentScreen('debt_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openRecordPaymentModal = (debtId?: string, payment?: PaymentRecord, suggestedAmount?: number) => {
    setIsAddDebtOpen(false);
    setEditingDebtId(null);
    setEditingPayment(payment || null);
    setSuggestedPaymentAmount(suggestedAmount ?? null);
    if (debtId) {
      setTargetPaymentDebtId(debtId);
    } else if (debts.length > 0) {
      setTargetPaymentDebtId(debts[0].id);
    }
    setIsRecordPaymentOpen(true);
  };

  const openEditDebtModal = (debtId: string) => {
    setIsRecordPaymentOpen(false);
    setEditingPayment(null);
    setSuggestedPaymentAmount(null);
    setEditingDebtId(debtId);
    setIsAddDebtOpen(true);
  };

  const openAddDebtModal = () => {
    if (userProfile.plan === 'cero' && debts.length >= 2) {
      showToast('El plan Cero permite registrar máximo 2 deudas.');
      setCurrentScreen('subscription');
      return;
    }
    setIsRecordPaymentOpen(false);
    setEditingPayment(null);
    setSuggestedPaymentAmount(null);
    setEditingDebtId(null);
    setIsAddDebtOpen(true);
  };

  // Actions
  const handleAddDebt = async (newDebtData: CreateDebtPayload) => {
    const wasEditing = Boolean(editingDebtId);
    const created = editingDebtId
      ? await debtService.updateDebt(editingDebtId, newDebtData)
      : await debtService.createDebt(newDebtData);
    setEditingDebtId(null);
    await refreshAllData();
    showToast(wasEditing
      ? `Deuda "${created.name}" actualizada con éxito`
      : `¡Deuda "${created.name}" registrada con éxito!`);
  };

  const handleUpdateDebt = async (id: string, updates: Partial<Debt>) => {
    await debtService.updateDebt(id, updates);
    await refreshAllData();
    showToast('Deuda actualizada correctamente');
  };

  const handleDeleteDebt = async (id: string) => {
    await debtService.deleteDebt(id);
    if (selectedDebtId === id) {
      setSelectedDebtId(null);
      setCurrentScreen('debts');
    }
    await refreshAllData();
    showToast('Deuda eliminada del sistema');
  };

  const handleRecordPayment = async (paymentData: {
    debtId: string;
    amount: number;
    type: PaymentRecord['type'];
    notes?: string;
    date: string;
  }) => {
    const payment = await debtService.recordPayment(paymentData);
    await refreshAllData();
    showToast(`Pago registrado: ${formatCurrency(payment.amount)} a ${payment.debtName}`);
  };

  const handleUpdatePayment = async (id: string, paymentData: {
    debtId: string;
    amount: number;
    type: PaymentRecord['type'];
    notes?: string;
    date: string;
  }) => {
    await debtService.updatePayment(id, paymentData);
    await refreshAllData();
    showToast('Pago actualizado correctamente');
  };

  const handleDeletePayment = async (id: string) => {
    await debtService.deletePayment(id);
    await refreshAllData();
    showToast('Pago eliminado y saldo recalculado');
  };

  const handleUpdateUserProfile = async (updates: Partial<UserProfile>) => {
    const updated = await userService.updateUserProfile(updates);
    setUserProfile(updated);
    showToast('Perfil actualizado correctamente');
  };

  const handleUpdateFinancialProfile = async (updates: Partial<FinancialProfile>) => {
    const updated = await userService.updateFinancialProfile({ ...financialProfile, ...updates });
    setFinancialProfile(updated);
    setActiveStrategyState(updated.activeStrategy);
    await refreshDashboard();
    showToast('Datos financieros actualizados');
  };

  const setActiveStrategy = async (strategy: StrategyType): Promise<void> => {
    try {
      await strategyService.updateActiveStrategy(strategy);
      setActiveStrategyState(strategy);
      setFinancialProfile((prev) => ({ ...prev, activeStrategy: strategy }));
      await refreshDashboard();
      showToast(`Estrategia ${strategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'} guardada`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No fue posible guardar la estrategia');
      throw error;
    }
  };

  const handleUpdatePreferences = async (updates: Partial<UserPreferences>) => {
    const updated = await userService.updatePreferences(updates);
    setPreferences(updated);
    showToast('Preferencias guardadas');
  };

  const handleUpgradePlan = async (plan: 'cero' | 'plus', cycle: 'monthly' | 'annual') => {
    const updated = await userService.upgradePlan(plan, cycle);
    setUserProfile(updated);
    showToast(`¡Suscripción actualizada a ${plan === 'plus' ? 'Ceroa Plus' : 'Plan Cero'}!`);
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      const res = await notificationService.markAsReadSingle(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, readAt: res.readAt } : n)));
      setUnreadNotificationsCount(res.unreadCount);
    } catch {
      const updated = await notificationService.markAsRead(id);
      setNotifications(updated);
      setUnreadNotificationsCount(updated.filter((n) => !n.read).length);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const updated = await notificationService.markAllAsRead();
    setNotifications(updated);
    setUnreadNotificationsCount(0);
    showToast('Todas las notificaciones marcadas como leídas');
  };

  const handleLogout = async () => {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    localStorage.setItem('ceroa_logout_pending', 'true');
    setLogoutPending(true);
    setLogoutError('');
    clearAuthenticatedState();
    try {
      await authService.logout();
      localStorage.removeItem('ceroa_logout_pending');
      setLogoutPending(false);
      showToast('Sesión cerrada con éxito');
    } catch {
      setLogoutError('Tus datos están ocultos, pero no fue posible confirmar el cierre en el servidor. Reintenta para finalizar la sesión.');
    } finally {
      logoutInFlight.current = false;
    }
  };

  useEffect(() => {
    if (localStorage.getItem('ceroa_logout_pending') === 'true') void handleLogout();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'ceroa_logout_pending') return;
      clearAuthenticatedState();
      if (event.newValue === 'true') void handleLogout();
      else { setLogoutPending(false); setLogoutError(''); }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [clearAuthenticatedState]);

  const handleLogin = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setUserProfile(user);
    setIsAuthenticated(true);
    setCurrentScreen(user.initialSetupComplete ? 'dashboard' : 'initial_setup');
    if (user.initialSetupComplete) await refreshAllData(); else setIsLoading(false);
    showToast('¡Bienvenido a Ceroa!');
  };

  const handleRegister = async (payload: RegisterPayload) => {
    const user = await authService.register(payload);
    setUserProfile(user);
    setIsAuthenticated(true);
    setCurrentScreen(user.initialSetupComplete ? 'dashboard' : 'initial_setup');
    if (user.initialSetupComplete) await refreshAllData(); else setIsLoading(false);
    showToast(`¡Cuenta creada con éxito para ${user.fullName}!`);
  };

  // Financial aggregates
  const {
    totalDebt,
    totalOriginalDebt,
    totalPaidSoFar,
    totalRecordedPayments,
    overallProgressPercentage,
    nextTotalMonthlyPayment,
    activeAccountsCount
  } = useMemo(() => calculateDebtSummary(debts, payments), [debts, payments]);

  // Formatters
  const formatNumber = formatNumberValue;
  const formatCurrency = useCallback(
    (amount: number, overrideCurrency?: CurrencyCode) =>
      formatCurrencyValue(amount, overrideCurrency ?? preferences.currency),
    [preferences.currency]
  );
  const formatDate = formatDateValue;

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        isAuthenticated,
        isAuthChecking,
        logoutPending,
        logoutError,
        selectedDebtId,
        setSelectedDebtId,
        navigateToDebtDetail,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapse,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,
        debts,
        payments,
        userProfile,
        financialProfile,
        preferences,
        notifications,
        upcomingDues,
        unreadNotificationsCount,
        isLoading,
        dataError,
        dashboardSummary,
        isDashboardLoading,
        dashboardError,
        refreshDashboard,
        activeStrategy,
        setActiveStrategy,
        totalDebt,
        totalOriginalDebt,
        totalPaidSoFar,
        totalRecordedPayments,
        overallProgressPercentage,
        nextTotalMonthlyPayment,
        activeAccountsCount,
        formatCurrency,
        formatNumber,
        formatDate,
        isAddDebtOpen,
        setIsAddDebtOpen,
        openAddDebtModal,
        isRecordPaymentOpen,
        setIsRecordPaymentOpen,
        targetPaymentDebtId,
        setTargetPaymentDebtId,
        editingPayment,
        suggestedPaymentAmount,
        openRecordPaymentModal,
        editingDebtId,
        setEditingDebtId,
        openEditDebtModal,
        isEditFinancialOpen,
        setIsEditFinancialOpen,
        isEditProfileOpen,
        setIsEditProfileOpen,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        isExportReportOpen,
        setIsExportReportOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,
        toastMessage,
        showToast,
        refreshAllData,
        handleAddDebt,
        handleUpdateDebt,
        handleDeleteDebt,
        handleRecordPayment,
        handleUpdatePayment,
        handleDeletePayment,
        handleUpdateUserProfile,
        handleUpdateFinancialProfile,
        handleUpdatePreferences,
        handleUpgradePlan,
        handleMarkNotificationRead,
        handleMarkAllNotificationsRead,
        handleLogout,
        handleLogin,
        handleRegister
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
