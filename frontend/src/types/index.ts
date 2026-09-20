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
  debtCurrentBalance?: number;
  debtStatus?: DebtStatus;
  debtOriginalAmount?: number;
}

export interface PaymentMutationResponse {
  paymentId: string;
  debtId: string;
  debtName: string;
  amount: number;
  debtCurrentBalance: number;
  debtStatus: DebtStatus;
  debtOriginalAmount?: number;
  message: string;
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

export interface SimulationEventItem {
  id: string;
  date?: string;
  period?: number;
  extraPayment?: number;
  modifiedMonthlyPayment?: number;
}

export interface SimulationRequestPayload {
  debtId: string;
  strategy: StrategyType;
  events: Array<{
    date?: string;
    period?: number;
    extraPayment?: number;
    modifiedMonthlyPayment?: number;
  }>;
}

export interface SimulationPeriodDetail {
  period: number;
  date: string;
  openingBalance: number;
  normalPayment: number;
  extraPayment: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

export interface SimulationProjectionDetail {
  totalInterest: number;
  totalPrincipal: number;
  estimatedMonths: number;
  estimatedPayoffDate: string;
}

export interface SimulationDifferencesDetail {
  monthsReduced: number;
  estimatedInterestSavings: number;
}

export interface SimulationResponsePayload {
  status: 'SUCCESS' | 'INSUFFICIENT_DATA';
  statusReason?: string | null;
  debt: {
    id: string;
    name: string;
    entity: string;
    currentBalance: number;
    interestRate: number;
    rateType: RateType;
    categoryLabel: string;
  };
  simulatedStrategy: StrategyType;
  assumptions: string[];
  baseline: SimulationProjectionDetail | null;
  simulated: SimulationProjectionDetail | null;
  differences: SimulationDifferencesDetail | null;
  periods: SimulationPeriodDetail[];
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

export type ReminderMilestone = 'SEVEN_DAYS' | 'THREE_DAYS' | 'DUE_TODAY' | 'NONE';

export interface UpcomingDueItem {
  debtId: string;
  debtName: string;
  entity: string;
  type: DebtType;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  status: 'al_dia' | 'vence_hoy' | 'en_mora' | 'pagada';
  reminderMilestone: ReminderMilestone;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo?: string;
  type: string;
  read: boolean;
  date?: string;
  eventDate?: string;
  relatedDebtId?: string | null;
  relatedDebtName?: string | null;
  readAt?: string | null;
  channel?: 'IN_APP' | 'TELEGRAM' | string;
  eventKey?: string | null;
  planRestricted?: boolean;
  createdAt?: string;
}

export type AppScreen = 
  | 'recovery'
  | 'initial_setup'
  | 'dashboard'
  | 'monthly_progress'
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

export interface DashboardNextDue {
  debtId: string;
  debtName: string;
  entity: string;
  debtType: DebtType;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
}

export interface DashboardProgress {
  totalOriginalDebt: number | null;
  totalPaidSoFar: number | null;
  totalRecordedPayments: number;
  percentage: number | null;
  hasProgressData: boolean;
}

export type DashboardStatus = 'EMPTY' | 'INSUFFICIENT_DATA' | 'SUCCESS';

export interface DashboardSummary {
  totalRegisteredDebt: number;
  activeDebtCount: number;
  requiredPaymentsCurrentPeriod: number | null;
  hasRequiredPaymentsData: boolean;
  nextDue: DashboardNextDue | null;
  upcomingDues: DashboardNextDue[];
  availableForDebt: number;
  activeStrategy: StrategyType;
  progress: DashboardProgress;
  estimatedDebtFreeDate: string | null;
  hasEstimatedDebtFreeDate: boolean;
  totalDeclaredDebts: number;
  registeredDebtCount: number;
  partialCoverage: boolean;
  status: DashboardStatus;
}

export interface StrategyDebtItem {
  id: string;
  name: string;
  entity: string;
  type: DebtType;
  categoryLabel: string;
  currentBalance: number;
  originalAmount: number;
  interestRate: number;
  rateType: RateType;
  comparableRate: number | null;
  isRateComparable: boolean;
  rateReason: string | null;
  priority: number | null;
  isPriority: boolean;
  basePayment: number;
  extraPayment: number | null;
  recommendedPayment: number;
  projectedInterest: number | null;
  projectedPrincipal: number | null;
  estimatedPayoffDate: string | null;
  estimatedMonths: number | null;
  projectionAvailable: boolean;
}

export interface StrategyProjection {
  available: boolean;
  payoffDate: string | null;
  months: number | null;
  totalInterest: number | null;
  totalPrincipal: number | null;
  monthlyBudget: number | null;
  isEstimated: boolean;
  missingReason: string | null;
}

export interface StrategyStats {
  totalInterest: number;
  payoffDate: string;
  months: number;
  orderedDebtIds: string[];
}

export interface StrategyComparisonDetail {
  available: boolean;
  snowball: StrategyStats | null;
  avalanche: StrategyStats | null;
  interestDifference: number | null;
  monthsDifference: number | null;
  missingReason: string | null;
}

export type StrategyExecutionStatus = 'EMPTY' | 'INSUFFICIENT_DATA' | 'SUCCESS';

export interface StrategyResponse {
  plan: 'cero' | 'plus' | 'CERO' | 'PLUS';
  activeStrategy: StrategyType;
  status: StrategyExecutionStatus;
  statusReason: string | null;
  hasNonComparableDebts: boolean;
  consideredDebtsCount: number;
  totalActiveDebtsCount: number;
  orderedDebts: StrategyDebtItem[];
  priorityDebt: StrategyDebtItem | null;
  summaryProjection: StrategyProjection | null;
  globalProjection: StrategyProjection | null;
  comparison: StrategyComparisonDetail | null;
}
