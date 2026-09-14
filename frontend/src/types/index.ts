export type CurrencyCode = 'COP' | 'MXN' | 'USD';

export type DebtType = 
  | 'credit_card' 
  | 'personal_loan'
  | 'mortgage' 
  | 'auto_loan' 
  | 'student_loan' 
  | 'retail_credit'
  | 'installment_purchase'
  | 'overdue_bill'
  | 'family_loan'
  | 'other';

export type RateType = 'EA' | 'MV' | 'NAMV' | 'INDEXED' | 'IBR_MARGIN' | 'IPC_MARGIN' | 'UVR_MARGIN' | 'NONE';

export type DebtStatus = 'al_dia' | 'vence_hoy' | 'en_mora' | 'pagada';

export interface Debt {
  id: string;
  name: string;
  entity: string;
  type: DebtType;
  categoryLabel: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number; // Percentage, e.g. 28.5%
  rateType: RateType;
  monthlyPayment: number;
  minimumPayment: number;
  dueDateDay: number; // Day of the month, 1-31
  nextDueDate: string; // e.g. "2023-11-15" or "15 Nov, 2023"
  disbursementDate?: string;
  termRemainingMonths?: number;
  accountNumber?: string;
  status: DebtStatus;
  notes?: string;
  color?: string;
  isPriority?: boolean;
  details?: Record<string, any>;
  paymentCount?: number;
}

export type CreateDebtPayload = {
  name: string;
  entity?: string;
  type: DebtType;
  categoryLabel: string;
  originalAmount?: number;
  currentBalance: number;
  interestRate: number;
  rateType: RateType;
  monthlyPayment: number;
  minimumPayment: number;
  dueDateDay?: number;
  nextDueDate?: string;
  disbursementDate?: string;
  termRemainingMonths?: number;
  accountNumber?: string;
  notes?: string;
  color?: string;
  details?: Record<string, any>;
};

export type PaymentType = 'monthly_fee' | 'extra_principal' | 'minimum' | 'full';

export interface PaymentRecord {
  id: string;
  debtId: string;
  debtName: string;
  amount: number;
  date: string; // e.g. "15 Oct, 2023"
  type: PaymentType;
  typeLabel: string;
  status: 'completed' | 'pending';
  notes?: string;
}

export interface CalendarCommitment {
  id: string;
  debtId: string;
  debtName: string;
  debtType: DebtType;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  day: number;
  status: 'pending' | 'paid';
  urgencyLabel?: string; // "Vence hoy", "En 3 días", etc.
  typeLabel: string; // "Pago mínimo", "Cuota fija", etc.
}

export type StrategyType = 'snowball' | 'avalanche';

export interface UserProfile {
  initialSetupComplete?: boolean;
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  documentId?: string;
  birthDate?: string;
  avatarUrl?: string;
  plan: 'cero' | 'plus';
}

export interface FinancialProfile {
  monthlyIncome: number;
  fixedExpenses: number;
  availableMoney: number;
  paymentCapacity: number; // Suggested or max for debt
  capacityUsagePercentage: number;
  totalDeclaredDebts: number;
  registeredDebts: number;
  incompleteCoverage: boolean;
  activeStrategy: StrategyType;
}

export interface UserPreferences {
  darkMode: boolean;
  language: 'es' | 'en';
  currency: CurrencyCode;
  emailNotifications: boolean;
  dueAlertsDaysBefore: number;
}

export interface SimulationParams {
  selectedDebtId: string; // 'all' or specific debt ID
  lumpSumExtra: number;
  monthlyIncrease: number;
}

export interface SimulationResult {
  savedInterest: number;
  savedMonths: number;
  originalPayoffDate: string;
  newPayoffDate: string;
  originalTotalCost: number;
  simulatedTotalCost: number;
  reductionPercentage: number;
  timeline: {
    label: string;
    actualBalance: number;
    simulatedBalance: number;
  }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  type: 'reminder' | 'milestone' | 'system' | 'tip';
  read: boolean;
  date: string;
}

export type AppScreen = 
  | 'recovery'
  | 'initial_setup'
  | 'dashboard'
  | 'debts'
  | 'debt_detail'
  | 'strategy'
  | 'simulation'
  | 'calendar'
  | 'subscription'
  | 'profile'
  | 'notifications'
  | 'login'
  | 'register';
