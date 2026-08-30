import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  AppScreen, 
  CurrencyCode, 
  Debt, 
  FinancialProfile, 
  NotificationItem, 
  PaymentRecord, 
  SimulationParams, 
  SimulationResult, 
  StrategyType, 
  UserPreferences, 
  UserProfile 
} from '../types';
import { debtService } from '../services/debtService';
import { userService } from '../services/userService';
import { simulationService } from '../services/simulationService';
import { notificationService } from '../services/notificationService';
import { authService, RegisterPayload } from '../services/authService';

interface AppContextType {
  // Navigation & Screen
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  isAuthenticated: boolean;
  isAuthChecking: boolean;
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
  unreadNotificationsCount: number;
  isLoading: boolean;
  dataError: string | null;

  // Strategy & Simulation
  activeStrategy: StrategyType;
  setActiveStrategy: (strategy: StrategyType) => void;
  simulationParams: SimulationParams;
  setSimulationParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  simulationResult: SimulationResult | null;
  runSimulationCalculation: () => Promise<void>;

  // Financial Aggregates
  totalDebt: number;
  totalOriginalDebt: number;
  totalPaidSoFar: number;
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
  isRecordPaymentOpen: boolean;
  setIsRecordPaymentOpen: (open: boolean) => void;
  targetPaymentDebtId: string | null;
  setTargetPaymentDebtId: (id: string | null) => void;
  editingPayment: PaymentRecord | null;
  openRecordPaymentModal: (debtId?: string, payment?: PaymentRecord) => void;
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
  handleAddDebt: (debt: Omit<Debt, 'id'>) => Promise<void>;
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
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Core Data
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'usr-1',
    fullName: 'Mateo Mendoza',
    email: 'mateo.mendoza@email.com',
    plan: 'plus',
    billingCycle: 'annual'
  });
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile>({
    monthlyIncome: 0,
    fixedExpenses: 0,
    availableMoney: 0,
    paymentCapacity: 0,
    capacityUsagePercentage: 0,
    totalDeclaredDebts: 1,
    registeredDebts: 0,
    incompleteCoverage: true,
    activeStrategy: 'snowball'
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    darkMode: false,
    language: 'es',
    currency: 'COP',
    emailNotifications: true,
    dueAlertsDaysBefore: 3
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modals & Drawers
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [targetPaymentDebtId, setTargetPaymentDebtId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [isEditFinancialOpen, setIsEditFinancialOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sidebar Controls (Desktop collapse & Mobile slide-over)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ceroa_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ceroa_sidebar_collapsed', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen((prev) => !prev);
  }, []);

  // Strategy & Simulation
  const [activeStrategy, setActiveStrategyState] = useState<StrategyType>('snowball');
  const [simulationParams, setSimulationParams] = useState<SimulationParams>({
    selectedDebtId: 'all',
    lumpSumExtra: 500000,
    monthlyIncrease: 50000
  });
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setDataError(null);
      const [fDebts, fPayments, fUser, fFin, fPrefs, fNotifs] = await Promise.all([
        debtService.getDebts(),
        debtService.getPayments(),
        userService.getUserProfile(),
        userService.getFinancialProfile(),
        userService.getPreferences(),
        notificationService.getNotifications()
      ]);

      setDebts(fDebts);
      setPayments(fPayments);
      setUserProfile(fUser);
      setFinancialProfile(fFin);
      setActiveStrategyState(fFin.activeStrategy);
      setPreferences(fPrefs);
      setNotifications(fNotifs);

    } catch (e) {
      console.error('Failed to load initial application data:', e);
      setDataError(e instanceof Error ? e.message : 'No fue posible cargar la información financiera.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const restoreSession = async () => {
      try {
        const user = await authService.me();
        if (cancelled) return;
        setUserProfile(user);
        setIsAuthenticated(true);
        setCurrentScreen('dashboard');
        await refreshAllData();
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
    if (preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.darkMode]);

  // Recalculate simulation when debts, strategy or params change
  const runSimulationCalculation = useCallback(async () => {
    if (debts.length === 0) return;
    const res = await simulationService.runSimulation(debts, simulationParams, activeStrategy);
    setSimulationResult(res);
  }, [debts, simulationParams, activeStrategy]);

  useEffect(() => {
    runSimulationCalculation();
  }, [runSimulationCalculation]);

  // Navigation helper
  const navigateToDebtDetail = (id: string) => {
    setSelectedDebtId(id);
    setCurrentScreen('debt_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openRecordPaymentModal = (debtId?: string, payment?: PaymentRecord) => {
    setEditingPayment(payment || null);
    if (debtId) {
      setTargetPaymentDebtId(debtId);
    } else if (debts.length > 0) {
      setTargetPaymentDebtId(debts[0].id);
    }
    setIsRecordPaymentOpen(true);
  };

  const openEditDebtModal = (debtId: string) => {
    setEditingDebtId(debtId);
    setIsAddDebtOpen(true);
  };

  // Actions
  const handleAddDebt = async (newDebtData: Omit<Debt, 'id'>) => {
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
    const updated = await userService.updateFinancialProfile(updates);
    setFinancialProfile(updated);
    setActiveStrategyState(updated.activeStrategy);
    showToast('Datos financieros actualizados');
  };

  const setActiveStrategy = (strategy: StrategyType) => {
    const previous = activeStrategy;
    setActiveStrategyState(strategy);
    void userService.updateFinancialProfile({ activeStrategy: strategy })
      .then((updated) => {
        setFinancialProfile(updated);
        showToast(`Estrategia ${strategy === 'snowball' ? 'Bola de Nieve' : 'Avalancha'} guardada`);
      })
      .catch((error) => {
        setActiveStrategyState(previous);
        showToast(error instanceof Error ? error.message : 'No fue posible guardar la estrategia');
      });
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
    const updated = await notificationService.markAsRead(id);
    setNotifications(updated);
  };

  const handleMarkAllNotificationsRead = async () => {
    const updated = await notificationService.markAllAsRead();
    setNotifications(updated);
    showToast('Todas las notificaciones marcadas como leídas');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setIsAuthenticated(false);
      setCurrentScreen('login');
      setDebts([]);
      setPayments([]);
      setDataError(null);
      showToast('Sesión cerrada con éxito');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setUserProfile(user);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    await refreshAllData();
    showToast('¡Bienvenido a Ceroa!');
  };

  const handleRegister = async (payload: RegisterPayload) => {
    const user = await authService.register(payload);
    setUserProfile(user);
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
    await refreshAllData();
    showToast(`¡Cuenta creada con éxito para ${user.fullName}!`);
  };

  // Financial aggregates
  const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
  const totalOriginalDebt = debts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalPaidSoFar = Math.max(0, totalOriginalDebt - totalDebt);
  const overallProgressPercentage = totalOriginalDebt > 0 
    ? Math.min(100, Math.round((totalPaidSoFar / totalOriginalDebt) * 100)) 
    : 0;
  const nextTotalMonthlyPayment = debts.reduce((sum, d) => sum + (d.monthlyPayment || d.minimumPayment || 0), 0);
  const activeAccountsCount = debts.filter((d) => d.currentBalance > 0).length;
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Formatters
  const formatNumber = (val: number): string => {
    return new Intl.NumberFormat('es-CO', {
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatCurrency = (amount: number, overrideCurrency?: CurrencyCode): string => {
    const curr = overrideCurrency || preferences.currency || 'COP';
    const formattedNum = formatNumber(amount);
    
    if (curr === 'COP') {
      return `$ ${formattedNum}`;
    } else if (curr === 'MXN') {
      return `$${formattedNum} MXN`;
    } else {
      return `$${formattedNum} USD`;
    }
  };

  const formatDate = (date: string | undefined): string => {
    if (!date) return 'Sin fecha';
    const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
  };

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        isAuthenticated,
        isAuthChecking,
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
        unreadNotificationsCount,
        isLoading,
        dataError,
        activeStrategy,
        setActiveStrategy,
        simulationParams,
        setSimulationParams,
        simulationResult,
        runSimulationCalculation,
        totalDebt,
        totalOriginalDebt,
        totalPaidSoFar,
        overallProgressPercentage,
        nextTotalMonthlyPayment,
        activeAccountsCount,
        formatCurrency,
        formatNumber,
        formatDate,
        isAddDebtOpen,
        setIsAddDebtOpen,
        isRecordPaymentOpen,
        setIsRecordPaymentOpen,
        targetPaymentDebtId,
        setTargetPaymentDebtId,
        editingPayment,
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
