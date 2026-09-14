import { DebtType, RateType } from '../../../types';

export interface DebtTypeOption {
  value: DebtType;
  label: string;
  category: string;
  description: string;
  requiresEntity: boolean;
  originalAmountLabel?: string;
  isOriginalAmountOptional?: boolean;
}

export const DEBT_TYPES: DebtTypeOption[] = [
  {
    value: 'credit_card',
    label: 'Tarjeta de crédito',
    category: 'Tarjeta de crédito',
    description: 'Tarjetas bancarias con cupo rotativo y pago mínimo.',
    requiresEntity: true,
    originalAmountLabel: 'Cupo total',
    isOriginalAmountOptional: false
  },
  {
    value: 'personal_loan',
    label: 'Préstamo personal / libre inversión',
    category: 'Préstamo personal',
    description: 'Créditos de consumo o libre inversión con cuota periódica.',
    requiresEntity: true,
    originalAmountLabel: 'Valor inicial desembolsado',
    isOriginalAmountOptional: false
  },
  {
    value: 'mortgage',
    label: 'Crédito hipotecario / vivienda',
    category: 'Crédito hipotecario',
    description: 'Financiación de vivienda en Pesos o UVR a largo plazo.',
    requiresEntity: true,
    originalAmountLabel: 'Valor financiado inicial',
    isOriginalAmountOptional: false
  },
  {
    value: 'auto_loan',
    label: 'Crédito de vehículo',
    category: 'Crédito de vehículo',
    description: 'Financiación vehicular con cuotas fijas o pago extraordinario.',
    requiresEntity: true,
    originalAmountLabel: 'Valor financiado inicial',
    isOriginalAmountOptional: false
  },
  {
    value: 'student_loan',
    label: 'Crédito educativo',
    category: 'Crédito educativo',
    description: 'Obligaciones educativas en etapa de estudio, gracia o amortización.',
    requiresEntity: true,
    originalAmountLabel: 'Valor financiado',
    isOriginalAmountOptional: false
  },
  {
    value: 'retail_credit',
    label: 'Crédito comercial / almacén',
    category: 'Crédito comercial',
    description: 'Créditos en tiendas departamentales o comercios.',
    requiresEntity: true,
    originalAmountLabel: 'Valor original',
    isOriginalAmountOptional: false
  },
  {
    value: 'installment_purchase',
    label: 'Compra a cuotas / crédito digital',
    category: 'Compra a cuotas',
    description: 'BNPL o compras fraccionadas en plataformas digitales.',
    requiresEntity: true,
    originalAmountLabel: 'Monto inicial',
    isOriginalAmountOptional: false
  },
  {
    value: 'overdue_bill',
    label: 'Factura u obligación vencida',
    category: 'Obligación vencida',
    description: 'Servicios públicos, telefonía o compromisos impagos con mora.',
    requiresEntity: true,
    originalAmountLabel: 'Valor original de la factura',
    isOriginalAmountOptional: false
  },
  {
    value: 'family_loan',
    label: 'Deuda con familiar o amigo',
    category: 'Familiar o amigo',
    description: 'Préstamos informales entre personas de confianza.',
    requiresEntity: false,
    originalAmountLabel: 'Valor inicial (opcional)',
    isOriginalAmountOptional: true
  },
  {
    value: 'other',
    label: 'Otra obligación',
    category: 'Otra obligación',
    description: 'Otras deudas o compromisos particulares.',
    requiresEntity: false,
    originalAmountLabel: 'Valor inicial (opcional)',
    isOriginalAmountOptional: true
  }
];

export const RATE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'EA', label: 'Efectiva Anual (E.A.)' },
  { value: 'MV', label: 'Mes Vencido (M.V.)' },
  { value: 'NAMV', label: 'Nominal Anual Mes Vencido (N.A.M.V.)' },
  { value: 'INDEXED', label: 'Indexada / variable' },
  { value: 'IBR_MARGIN', label: 'IBR + margen' },
  { value: 'IPC_MARGIN', label: 'IPC + margen' },
  { value: 'UVR_MARGIN', label: 'UVR + margen' },
  { value: 'NONE', label: 'Sin intereses' }
];

export interface DebtFormState {
  name: string;
  entity: string;
  type: DebtType;
  categoryLabel: string;
  originalAmount: number | undefined;
  currentBalance: number;
  interestRate: number;
  rateType: RateType;
  monthlyPayment: number;
  minimumPayment: number;
  dueDateDay: number;
  nextDueDate: string;
  disbursementDate: string | undefined;
  termRemainingMonths: number;
  accountNumber: string;
  notes: string;
  color: string;
  details: Record<string, any>;
}

export const getInitialFormForType = (type: DebtType): DebtFormState => {
  const schema = DEBT_TYPES.find((t) => t.value === type) || DEBT_TYPES[0];
  const defaults: Record<string, any> = {};

  if (type === 'mortgage') {
    defaults.modality = 'PESOS';
  } else if (type === 'student_loan') {
    defaults.stage = 'AMORTIZACION';
    defaults.hasPaymentObligation = true;
  } else if (type === 'retail_credit' || type === 'installment_purchase') {
    defaults.costType = 'RATE';
    defaults.totalInstallments = 12;
  } else if (type === 'family_loan' || type === 'other') {
    defaults.hasInterest = false;
  }

  return {
    name: '',
    entity: '',
    type,
    categoryLabel: schema.category,
    originalAmount: schema.isOriginalAmountOptional ? undefined : 0,
    currentBalance: 0,
    interestRate: 0,
    rateType: type === 'family_loan' || type === 'other' ? 'NONE' : 'EA',
    monthlyPayment: 0,
    minimumPayment: 0,
    dueDateDay: 15,
    nextDueDate: '',
    disbursementDate: undefined,
    termRemainingMonths: 0,
    accountNumber: '',
    notes: '',
    color: '#008FA6',
    details: defaults
  };
};

/**
 * TT-023.2 & CA-02:
 * Al cambiar el tipo de deuda antes de guardar, se adaptan los campos
 * y se limpian o invalidan datos incompatibles del tipo anterior.
 */
export const cleanIncompatibleValues = (prev: DebtFormState, newType: DebtType): DebtFormState => {
  const targetSchema = DEBT_TYPES.find((t) => t.value === newType) || DEBT_TYPES[0];
  const newDetails: Record<string, any> = {};

  if (newType === 'mortgage') {
    newDetails.modality = 'PESOS';
  } else if (newType === 'student_loan') {
    newDetails.stage = 'AMORTIZACION';
    newDetails.hasPaymentObligation = true;
  } else if (newType === 'retail_credit' || newType === 'installment_purchase') {
    newDetails.costType = 'RATE';
    newDetails.totalInstallments = 12;
  } else if (newType === 'family_loan' || newType === 'other') {
    newDetails.hasInterest = false;
  }

  return {
    name: prev.name,
    entity: targetSchema.requiresEntity ? prev.entity : prev.entity || '',
    type: newType,
    categoryLabel: targetSchema.category,
    originalAmount: targetSchema.isOriginalAmountOptional ? undefined : (prev.originalAmount || 0),
    currentBalance: prev.currentBalance,
    interestRate: newType === 'family_loan' || newType === 'other' ? 0 : prev.interestRate,
    rateType: newType === 'family_loan' || newType === 'other' ? 'NONE' : prev.rateType,
    monthlyPayment: prev.monthlyPayment,
    minimumPayment: newType === 'credit_card' ? prev.minimumPayment : 0,
    dueDateDay: prev.dueDateDay || 15,
    nextDueDate: prev.nextDueDate || '',
    disbursementDate: newType === 'personal_loan' ? prev.disbursementDate : undefined,
    termRemainingMonths: prev.termRemainingMonths || 0,
    accountNumber: prev.accountNumber || '',
    notes: prev.notes || '',
    color: prev.color || '#008FA6',
    details: newDetails
  };
};

