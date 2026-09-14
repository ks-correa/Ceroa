// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import * as AppContextModule from '../../context/AppContext';
import { DashboardSummary, Debt } from '../../types';

describe('EP-08 — Panel financiero principal (HU-037 y HU-038)', () => {
  afterEach(cleanup);

  const mockSetCurrentScreen = vi.fn();
  const mockNavigateToDebtDetail = vi.fn();
  const mockOpenRecordPaymentModal = vi.fn();
  const mockOpenAddDebtModal = vi.fn();
  const mockSetIsEditFinancialOpen = vi.fn();
  const mockRefreshDashboard = vi.fn();

  const sampleDebts: Debt[] = [
    {
      id: 'debt-card-1',
      name: 'Tarjeta Visa',
      entity: 'Bancolombia',
      type: 'credit_card',
      categoryLabel: 'Tarjeta de crédito',
      originalAmount: 5000000,
      currentBalance: 2000000,
      interestRate: 26.5,
      rateType: 'EA',
      monthlyPayment: 0,
      minimumPayment: 150000,
      dueDateDay: 15,
      nextDueDate: '2026-10-15',
      status: 'al_dia',
      paymentCount: 1
    },
    {
      id: 'debt-loan-2',
      name: 'Préstamo Auto',
      entity: 'Davivienda',
      type: 'auto_loan',
      categoryLabel: 'Crédito de vehículo',
      originalAmount: 20000000,
      currentBalance: 10000000,
      interestRate: 14.5,
      rateType: 'EA',
      monthlyPayment: 700000,
      minimumPayment: 0,
      dueDateDay: 25,
      nextDueDate: '2026-10-25',
      status: 'al_dia',
      paymentCount: 3
    }
  ];

  const sampleSummary: DashboardSummary = {
    totalRegisteredDebt: 12000000,
    activeDebtCount: 2,
    requiredPaymentsCurrentPeriod: 850000,
    hasRequiredPaymentsData: true,
    nextDue: {
      debtId: 'debt-card-1',
      debtName: 'Tarjeta Visa',
      entity: 'Bancolombia',
      debtType: 'credit_card',
      amount: 150000,
      dueDate: '2026-10-15',
      daysUntilDue: 7
    },
    upcomingDues: [
      {
        debtId: 'debt-card-1',
        debtName: 'Tarjeta Visa',
        entity: 'Bancolombia',
        debtType: 'credit_card',
        amount: 150000,
        dueDate: '2026-10-15',
        daysUntilDue: 7
      },
      {
        debtId: 'debt-loan-2',
        debtName: 'Préstamo Auto',
        entity: 'Davivienda',
        debtType: 'auto_loan',
        amount: 700000,
        dueDate: '2026-10-25',
        daysUntilDue: 17
      }
    ],
    availableForDebt: 1200000,
    activeStrategy: 'snowball',
    progress: {
      totalOriginalDebt: 25000000,
      totalPaidSoFar: 13000000,
      totalRecordedPayments: 4500000,
      percentage: 52,
      hasProgressData: true
    },
    estimatedDebtFreeDate: 'oct. de 2028',
    hasEstimatedDebtFreeDate: true,
    totalDeclaredDebts: 2,
    registeredDebtCount: 2,
    partialCoverage: false,
    status: 'SUCCESS'
  };

  const setupAppContext = (overrides = {}) => {
    vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
      userProfile: { id: 'u1', fullName: 'Carlos Gómez', email: 'carlos@ceroa.local', plan: 'cero' },
      financialProfile: {
        monthlyIncome: 4000000,
        fixedExpenses: 2000000,
        availableMoney: 1200000,
        paymentCapacity: 1200000,
        capacityUsagePercentage: 30,
        totalDeclaredDebts: 2,
        registeredDebts: 2,
        incompleteCoverage: false,
        activeStrategy: 'snowball'
      },
      debts: sampleDebts,
      payments: [],
      dashboardSummary: sampleSummary,
      isDashboardLoading: false,
      dashboardError: null,
      refreshDashboard: mockRefreshDashboard,
      activeStrategy: 'snowball',
      formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}`,
      formatNumber: (n: number) => n.toLocaleString('es-CO'),
      formatDate: (d: string | undefined) => d || '',
      setCurrentScreen: mockSetCurrentScreen,
      navigateToDebtDetail: mockNavigateToDebtDetail,
      openRecordPaymentModal: mockOpenRecordPaymentModal,
      openAddDebtModal: mockOpenAddDebtModal,
      setIsEditFinancialOpen: mockSetIsEditFinancialOpen,
      ...overrides
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // HU-037 — CONSULTAR RESUMEN FINANCIERO
  // =========================================================================
  describe('HU-037: Consultar resumen financiero', () => {
    it('CA-01 & CA-02 & TT-037.1: Muestra los indicadores principales requeridos con datos del backend', () => {
      setupAppContext();
      render(<DashboardView />);

      // CA-01: Deuda total registrada
      expect(screen.getByText(/Deuda Total Registrada/i)).not.toBeNull();
      expect(screen.getByText('$ 12.000.000')).not.toBeNull();

      // CA-01: Número de obligaciones activas
      expect(screen.getByText(/Obligaciones Activas/i)).not.toBeNull();
      expect(screen.getByText('2')).not.toBeNull();

      // CA-01: Suma de pagos/cuotas requeridos del periodo
      expect(screen.getByText(/Cuotas del Periodo/i)).not.toBeNull();
      expect(screen.getByText('$ 850.000')).not.toBeNull();

      // CA-01: Próximo vencimiento
      expect(screen.getByText(/Próximo Vencimiento/i)).not.toBeNull();
      expect(screen.getAllByText('Tarjeta Visa').length).toBeGreaterThan(0);
      expect(screen.getAllByText('$ 150.000').length).toBeGreaterThan(0);

      // CA-02: Dinero disponible para deudas
      expect(screen.getByText('Dinero Disponible')).not.toBeNull();
      expect(screen.getByText('$ 1.200.000')).not.toBeNull();

      // CA-02: Estrategia activa
      expect(screen.getByText('Estrategia de Pago')).not.toBeNull();
      expect(screen.getAllByText('Bola de Nieve').length).toBeGreaterThan(0);

      // CA-02: Progreso
      expect(screen.getByText(/Progreso General/i)).not.toBeNull();
      expect(screen.getByText('52% Pagado')).not.toBeNull();

      // CA-02: Fecha estimada para quedar libre de deudas
      expect(screen.getByText(/Cero Deudas Estimado/i)).not.toBeNull();
      expect(screen.getByText('oct. de 2028')).not.toBeNull();
      expect(screen.getByText(/Proyección estimada/i)).not.toBeNull();
    });

    it('CA-03 & TT-037.2: Permite acceder al contexto de la deuda desde el próximo vencimiento', () => {
      setupAppContext();
      render(<DashboardView />);

      const nextDueDetailBtn = screen.getByText(/Ver detalle de la deuda/i);
      fireEvent.click(nextDueDetailBtn);

      expect(mockNavigateToDebtDetail).toHaveBeenCalledWith('debt-card-1');
    });

    it('CA-03 & TT-037.2: Navega hacia Deudas/detalle desde la lista de próximos vencimientos', () => {
      setupAppContext();
      render(<DashboardView />);

      const autoLoanItem = screen.getByRole('button', { name: /Ver detalle de la deuda Préstamo Auto/i });
      fireEvent.click(autoLoanItem);

      expect(mockNavigateToDebtDetail).toHaveBeenCalledWith('debt-loan-2');
    });

    it('CA-07 & TT-037.4: Estado de carga muestra skeleton accesible y no cifras ficticias ni $0', () => {
      setupAppContext({
        dashboardSummary: null,
        isDashboardLoading: true
      });
      render(<DashboardView />);

      expect(screen.getByRole('status', { name: /Cargando resumen financiero/i })).not.toBeNull();
      expect(screen.queryByText('$ 0')).toBeNull();
      expect(screen.queryByText('0% Pagado')).toBeNull();
    });

    it('CA-07 & TT-037.4: Estado vacío cuando no existen registros aplicables', () => {
      setupAppContext({
        dashboardSummary: {
          ...sampleSummary,
          registeredDebtCount: 0,
          activeDebtCount: 0,
          status: 'EMPTY'
        },
        debts: []
      });
      render(<DashboardView />);

      expect(screen.getByText(/Empieza registrando tu primera deuda/i)).not.toBeNull();
      const addBtn = screen.getByRole('button', { name: /Registrar nueva deuda/i });
      fireEvent.click(addBtn);
      expect(mockOpenAddDebtModal).toHaveBeenCalled();
    });

    it('CA-07 & CA-08: Muestra "Datos insuficientes" en indicadores sin proyecciones ni cuotas válidas, sin inventar valores', () => {
      setupAppContext({
        dashboardSummary: {
          ...sampleSummary,
          requiredPaymentsCurrentPeriod: null,
          hasRequiredPaymentsData: false,
          estimatedDebtFreeDate: null,
          hasEstimatedDebtFreeDate: false,
          progress: {
            totalOriginalDebt: null,
            totalPaidSoFar: null,
            totalRecordedPayments: 0,
            percentage: null,
            hasProgressData: false
          }
        }
      });
      render(<DashboardView />);

      // Debe mostrar "Datos insuficientes" y NO inventar $0 o 0% o fechas
      const insufficientTexts = screen.getAllByText(/Datos insuficientes/i);
      expect(insufficientTexts.length).toBeGreaterThanOrEqual(3);

      expect(screen.queryByText('$ 0')).toBeNull();
      expect(screen.queryByText('0% Pagado')).toBeNull();
      expect(screen.queryByText('hoy')).toBeNull();
    });

    it('CA-08: Ante error muestra estado comprensible con reintento y sin números ficticios', () => {
      setupAppContext({
        dashboardSummary: null,
        dashboardError: 'Error al conectar con la API de Ceroa'
      });
      render(<DashboardView />);

      expect(screen.getByRole('alert')).not.toBeNull();
      expect(screen.getByText(/No fue posible obtener la información financiera/i)).not.toBeNull();
      expect(screen.getByText('Error al conectar con la API de Ceroa')).not.toBeNull();

      const retryBtn = screen.getByRole('button', { name: /Reintentar consulta/i });
      fireEvent.click(retryBtn);
      expect(mockRefreshDashboard).toHaveBeenCalled();

      expect(screen.queryByText('$ 0')).toBeNull();
    });
  });

  // =========================================================================
  // HU-038 — IDENTIFICAR COBERTURA PARCIAL
  // =========================================================================
  describe('HU-038: Identificar cobertura parcial', () => {
    it('CA-01 & CA-02: Muestra advertencia visible explicando que los resultados solo cubren las registradas cuando declaradas > registradas', () => {
      setupAppContext({
        dashboardSummary: {
          ...sampleSummary,
          totalDeclaredDebts: 5,
          registeredDebtCount: 2,
          partialCoverage: true
        }
      });
      render(<DashboardView />);

      const warning = screen.getByRole('note', { name: /Advertencia de cobertura parcial/i });
      expect(warning).not.toBeNull();

      expect(screen.getByText(/Cobertura parcial \(2 de 5 deudas registradas\)/i)).not.toBeNull();
      expect(
        screen.getByText(/se basan únicamente en las obligaciones efectivamente registradas/i)
      ).not.toBeNull();
    });

    it('CA-04: No muestra la advertencia cuando registradas >= declaradas', () => {
      setupAppContext({
        dashboardSummary: {
          ...sampleSummary,
          totalDeclaredDebts: 2,
          registeredDebtCount: 2,
          partialCoverage: false
        }
      });
      render(<DashboardView />);

      expect(screen.queryByRole('note', { name: /Advertencia de cobertura parcial/i })).toBeNull();
    });
  });
});
