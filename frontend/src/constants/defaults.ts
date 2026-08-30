import {
  FinancialProfile,
  SimulationParams,
  UserPreferences,
  UserProfile
} from '../types';

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: '',
  fullName: '',
  email: '',
  plan: 'cero'
};

export const DEFAULT_FINANCIAL_PROFILE: FinancialProfile = {
  monthlyIncome: 0,
  fixedExpenses: 0,
  availableMoney: 0,
  paymentCapacity: 0,
  capacityUsagePercentage: 0,
  totalDeclaredDebts: 1,
  registeredDebts: 0,
  incompleteCoverage: true,
  activeStrategy: 'snowball'
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  darkMode: false,
  language: 'es',
  currency: 'COP',
  emailNotifications: true,
  dueAlertsDaysBefore: 3
};

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  selectedDebtId: 'all',
  lumpSumExtra: 0,
  monthlyIncrease: 0
};
