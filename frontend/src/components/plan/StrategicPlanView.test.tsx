// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { StrategicPlanView } from './StrategicPlanView';
import * as AppContextModule from '../../context/AppContext';
import { strategyService } from '../../services/strategyService';
import { Debt, StrategyResponse } from '../../types';

vi.mock('../../services/strategyService');

describe('EP-09 — Estrategias de pago (HU-039, HU-040, HU-041)', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockSetActiveStrategy = vi.fn().mockResolvedValue(undefined);
  const mockRefreshDashboard = vi.fn().mockResolvedValue(undefined);
  const mockNavigateToDebtDetail = vi.fn();
  const mockSetIsExportReportOpen = vi.fn();
  const mockSetCurrentScreen = vi.fn();
  const mockFormatCurrency = (val: number) => `$ ${val.toLocaleString('es-CO')}`;

  const sampleDebts: Debt[] = [
    {
      id: 'debt-1',
      name: 'Tarjeta Visa',
      entity: 'Bancolombia',
      type: 'credit_card',
      categoryLabel: 'Tarjeta de crédito',
      originalAmount: 5000000,
      currentBalance: 1500000,
      interestRate: 26.5,
      rateType: 'EA',
      monthlyPayment: 0,
      minimumPayment: 120000,
      dueDateDay: 15,
      nextDueDate: '2026-10-15',
      status: 'al_dia'
    },
    {
      id: 'debt-2',
      name: 'Préstamo Auto',
      entity: 'Davivienda',
      type: 'auto_loan',
      categoryLabel: 'Crédito de vehículo',
      originalAmount: 15000000,
      currentBalance: 8000000,
      interestRate: 18.0,
      rateType: 'EA',
      monthlyPayment: 450000,
      minimumPayment: 0,
      dueDateDay: 20,
      nextDueDate: '2026-10-20',
      status: 'al_dia'
    },
    {
      id: 'debt-3',
      name: 'Libre Inversión',
      entity: 'Banco de Bogotá',
      type: 'personal_loan',
      categoryLabel: 'Préstamo personal',
      originalAmount: 10000000,
      currentBalance: 6000000,
      interestRate: 22.0,
      rateType: 'EA',
      monthlyPayment: 300000,
      minimumPayment: 0,
      dueDateDay: 25,
      nextDueDate: '2026-10-25',
      status: 'al_dia'
    }
  ];

  const mockCeroResponse: StrategyResponse = {
    plan: 'cero',
    activeStrategy: 'snowball',
    status: 'SUCCESS',
    statusReason: null,
    hasNonComparableDebts: false,
    consideredDebtsCount: 2,
    totalActiveDebtsCount: 3,
    orderedDebts: [
      {
        id: 'debt-1',
        name: 'Tarjeta Visa',
        entity: 'Bancolombia',
        type: 'credit_card',
        categoryLabel: 'Tarjeta de crédito',
        currentBalance: 1500000,
        originalAmount: 5000000,
        interestRate: 26.5,
        rateType: 'EA',
        comparableRate: 26.5,
        isRateComparable: true,
        rateReason: null,
        priority: 1,
        isPriority: true,
        basePayment: 120000,
        extraPayment: null,
        recommendedPayment: 120000,
        projectedInterest: null,
        projectedPrincipal: null,
        estimatedPayoffDate: null,
        estimatedMonths: null,
        projectionAvailable: false
      },
      {
        id: 'debt-2',
        name: 'Préstamo Auto',
        entity: 'Davivienda',
        type: 'auto_loan',
        categoryLabel: 'Crédito de vehículo',
        currentBalance: 8000000,
        originalAmount: 15000000,
        interestRate: 18.0,
        rateType: 'EA',
        comparableRate: 18.0,
        isRateComparable: true,
        rateReason: null,
        priority: 2,
        isPriority: false,
        basePayment: 450000,
        extraPayment: null,
        recommendedPayment: 450000,
        projectedInterest: null,
        projectedPrincipal: null,
        estimatedPayoffDate: null,
        estimatedMonths: null,
        projectionAvailable: false
      }
    ],
    priorityDebt: {
      id: 'debt-1',
      name: 'Tarjeta Visa',
      entity: 'Bancolombia',
      type: 'credit_card',
      categoryLabel: 'Tarjeta de crédito',
      currentBalance: 1500000,
      originalAmount: 5000000,
      interestRate: 26.5,
      rateType: 'EA',
      comparableRate: 26.5,
      isRateComparable: true,
      rateReason: null,
      priority: 1,
      isPriority: true,
      basePayment: 120000,
      extraPayment: null,
      recommendedPayment: 120000,
      projectedInterest: null,
      projectedPrincipal: null,
      estimatedPayoffDate: null,
      estimatedMonths: null,
      projectionAvailable: false
    },
    summaryProjection: {
      available: true,
      payoffDate: 'Nov de 2027',
      months: 14,
      totalInterest: 1850000,
      totalPrincipal: 9500000,
      monthlyBudget: 800000,
      isEstimated: true,
      missingReason: null
    },
    globalProjection: null,
    comparison: null
  };

  const mockPlusResponse: StrategyResponse = {
    plan: 'plus',
    activeStrategy: 'snowball',
    status: 'SUCCESS',
    statusReason: null,
    hasNonComparableDebts: false,
    consideredDebtsCount: 3,
    totalActiveDebtsCount: 3,
    orderedDebts: [
      {
        id: 'debt-1',
        name: 'Tarjeta Visa',
        entity: 'Bancolombia',
        type: 'credit_card',
        categoryLabel: 'Tarjeta de crédito',
        currentBalance: 1500000,
        originalAmount: 5000000,
        interestRate: 26.5,
        rateType: 'EA',
        comparableRate: 26.5,
        isRateComparable: true,
        rateReason: null,
        priority: 1,
        isPriority: true,
        basePayment: 120000,
        extraPayment: 230000,
        recommendedPayment: 350000,
        projectedInterest: 320000,
        projectedPrincipal: 1500000,
        estimatedPayoffDate: 'May de 2027',
        estimatedMonths: 8,
        projectionAvailable: true
      },
      {
        id: 'debt-3',
        name: 'Libre Inversión',
        entity: 'Banco de Bogotá',
        type: 'personal_loan',
        categoryLabel: 'Préstamo personal',
        currentBalance: 6000000,
        originalAmount: 10000000,
        interestRate: 22.0,
        rateType: 'EA',
        comparableRate: 22.0,
        isRateComparable: true,
        rateReason: null,
        priority: 2,
        isPriority: false,
        basePayment: 300000,
        extraPayment: 0,
        recommendedPayment: 300000,
        projectedInterest: 1200000,
        projectedPrincipal: 6000000,
        estimatedPayoffDate: 'Ene de 2028',
        estimatedMonths: 16,
        projectionAvailable: true
      },
      {
        id: 'debt-2',
        name: 'Préstamo Auto',
        entity: 'Davivienda',
        type: 'auto_loan',
        categoryLabel: 'Crédito de vehículo',
        currentBalance: 8000000,
        originalAmount: 15000000,
        interestRate: 18.0,
        rateType: 'EA',
        comparableRate: 18.0,
        isRateComparable: true,
        rateReason: null,
        priority: 3,
        isPriority: false,
        basePayment: 450000,
        extraPayment: 0,
        recommendedPayment: 450000,
        projectedInterest: 1950000,
        projectedPrincipal: 8000000,
        estimatedPayoffDate: 'Sep de 2028',
        estimatedMonths: 24,
        projectionAvailable: true
      }
    ],
    priorityDebt: null,
    summaryProjection: {
      available: true,
      payoffDate: 'Sep de 2028',
      months: 24,
      totalInterest: 3470000,
      totalPrincipal: 15500000,
      monthlyBudget: 1100000,
      isEstimated: true,
      missingReason: null
    },
    globalProjection: {
      available: true,
      payoffDate: 'Sep de 2028',
      months: 24,
      totalInterest: 3470000,
      totalPrincipal: 15500000,
      monthlyBudget: 1100000,
      isEstimated: true,
      missingReason: null
    },
    comparison: {
      available: true,
      snowball: {
        totalInterest: 3470000,
        payoffDate: 'Sep de 2028',
        months: 24,
        orderedDebtIds: ['debt-1', 'debt-3', 'debt-2']
      },
      avalanche: {
        totalInterest: 3120000,
        payoffDate: 'Jul de 2028',
        months: 22,
        orderedDebtIds: ['debt-1', 'debt-3', 'debt-2']
      },
      interestDifference: 350000,
      monthsDifference: 2,
      missingReason: null
    }
  };

  const setupAppContext = (plan: 'cero' | 'plus', activeStrategy: 'snowball' | 'avalanche' = 'snowball', debtsList = sampleDebts) => {
    vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
      debts: debtsList,
      activeStrategy,
      setActiveStrategy: mockSetActiveStrategy,
      refreshDashboard: mockRefreshDashboard,
      navigateToDebtDetail: mockNavigateToDebtDetail,
      setIsExportReportOpen: mockSetIsExportReportOpen,
      setCurrentScreen: mockSetCurrentScreen,
      formatCurrency: mockFormatCurrency,
      userProfile: {
        id: 'usr-1',
        fullName: 'Test User',
        email: 'test@ceroa.com',
        plan,
        initialSetupComplete: true,
        createdAt: '2026-01-01'
      } as any,
      financialProfile: {
        paymentCapacity: 1000000,
        availableMoney: 1000000,
        activeStrategy
      } as any
    } as any);
  };

  it('prioritizes a debt without navigating away and can restore automatic order', async () => {
    setupAppContext('cero');
    vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);
    vi.mocked(strategyService.updatePriority).mockResolvedValue(mockCeroResponse);
    render(<StrategicPlanView />);
    await screen.findByRole('button', { name: 'Priorizar Tarjeta Visa' });
    fireEvent.click(screen.getByRole('button', { name: 'Priorizar Tarjeta Visa' }));
    await waitFor(() => expect(strategyService.updatePriority).toHaveBeenCalledWith('debt-1'));
    expect(mockNavigateToDebtDetail).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Restablecer orden automático').hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByText('Restablecer orden automático'));
    await waitFor(() => expect(strategyService.updatePriority).toHaveBeenCalledWith(null));
  });

  describe('HU-039: Cambiar la estrategia activa', () => {
    it('CA-01 & CA-04: Muestra Bola de Nieve y Avalancha e identifica la estrategia activa', async () => {
      setupAppContext('cero', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /Bola de Nieve/i })).not.toBeNull();
        expect(screen.getByRole('radio', { name: /Avalancha/i })).not.toBeNull();
      });

      const snowballCard = screen.getByRole('radio', { name: /Bola de Nieve/i });
      expect(snowballCard.getAttribute('aria-checked')).toBe('true');
      expect(screen.getByText('ACTIVA')).not.toBeNull();
    });

    it('CA-02 & CA-03: Muestra las descripciones funcionales aprobadas exactas', async () => {
      setupAppContext('cero', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByText('prioriza la deuda con menor saldo')).not.toBeNull();
        expect(screen.getByText('prioriza la deuda con mayor tasa de interés')).not.toBeNull();
      });
    });

    it('CA-05 & CA-06: Mantiene la estrategia previa como definitiva durante el cambio y solo confirma tras éxito', async () => {
      setupAppContext('cero', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);

      let resolveBackendChange: (val: StrategyResponse) => void;
      const backendPromise = new Promise<StrategyResponse>((resolve) => {
        resolveBackendChange = resolve;
      });
      vi.mocked(strategyService.updateActiveStrategy).mockReturnValue(backendPromise);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /Bola de Nieve/i })).not.toBeNull();
      });

      // Hacer click en Avalancha
      const avalancheCard = screen.getByRole('radio', { name: /Avalancha/i });
      fireEvent.click(avalancheCard);

      // CA-05: Mientras está pendiente, Avalancha muestra "Cambiando...", pero Bola de Nieve SIGUE SIENDO ACTIVA
      expect(screen.getByText(/Cambiando/i)).not.toBeNull();
      expect(screen.getByText('ACTIVA')).not.toBeNull();
      expect(mockSetActiveStrategy).not.toHaveBeenCalled();

      // CA-06: Resolver la llamada del backend exitosamente
      const updatedResponse: StrategyResponse = {
        ...mockCeroResponse,
        activeStrategy: 'avalanche'
      };
      resolveBackendChange!(updatedResponse);

      await waitFor(() => {
        expect(mockSetActiveStrategy).toHaveBeenCalledWith('avalanche');
        expect(mockRefreshDashboard).toHaveBeenCalled();
      });
    });

    it('TT-039.2: Si el backend falla, conserva la estrategia previa y muestra mensaje de error', async () => {
      setupAppContext('cero', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);
      vi.mocked(strategyService.updateActiveStrategy).mockRejectedValue(new Error('Fallo en el servidor'));

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: /Bola de Nieve/i })).not.toBeNull();
      });

      const avalancheCard = screen.getByRole('radio', { name: /Avalancha/i });
      fireEvent.click(avalancheCard);

      await waitFor(() => {
        const alertEl = screen.getByRole('alert');
        expect(alertEl).not.toBeNull();
        expect(alertEl.textContent).toContain('No se pudo cambiar la estrategia');
      });

      // La estrategia activa sigue siendo Bola de Nieve
      expect(screen.getByText('ACTIVA')).not.toBeNull();
      expect(mockSetActiveStrategy).not.toHaveBeenCalled();
    });
  });

  describe('HU-040: Consultar estrategia básica con Cero', () => {
    it('CA-01, CA-02 & CA-03: Muestra máximo 2 deudas, orden básico y destaca la obligación prioritaria', async () => {
      setupAppContext('cero', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getAllByText(/Plan Cero/i).length).toBeGreaterThan(0);
        expect(screen.getByText('2 deudas en lista')).not.toBeNull();
        // Deuda 1 y Deuda 2 presentes
        expect(screen.getByRole('heading', { name: 'Tarjeta Visa' })).not.toBeNull();
        expect(screen.getByRole('heading', { name: 'Préstamo Auto' })).not.toBeNull();
        // Deuda 3 NO presente (máximo 2 deudas)
        expect(screen.queryByRole('heading', { name: 'Libre Inversión' })).toBeNull();
        // Identificación clara de prioridad 1
        expect(screen.getByText('PRIORIDAD 1')).not.toBeNull();
        expect(screen.getByText(/Obligación prioritaria actual/i)).not.toBeNull();
      });
    });

    it('CA-04 & CA-05: Muestra orientación de pago y proyección resumida diferenciada de saldos reales', async () => {
      setupAppContext('cero', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getAllByText('Orientación siguiente pago').length).toBeGreaterThan(0);
        expect(screen.getByText(/PROYECCIÓN ESTIMADA \(PLAN CERO\)/i)).not.toBeNull();
        expect(screen.getByText(/Nov de 2027/i)).not.toBeNull();
        expect(screen.getByText('14 meses')).not.toBeNull();
        expect(screen.getByText(/No constituye compromiso contractual/i)).not.toBeNull();
      });
    });

    it('CA-06: Cero NO dispone de detalle avanzado Plus (sin intereses por deuda ni comparativa)', async () => {
      setupAppContext('cero', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockCeroResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.queryByText(/Comparativa: Bola de Nieve vs Avalancha/i)).toBeNull();
        expect(screen.queryByText(/Incluye abono extra/i)).toBeNull();
      });
    });
  });

  describe('HU-041: Consultar estrategia completa con Ceroa Plus', () => {
    it('CA-01, CA-02 & CA-03: Considera todas las deudas, muestra cuota base y abono adicional recomendado', async () => {
      setupAppContext('plus', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockPlusResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByText('Ceroa Plus')).not.toBeNull();
        expect(screen.getByText('3 deudas en lista')).not.toBeNull();
        expect(screen.getByRole('heading', { name: 'Tarjeta Visa' })).not.toBeNull();
        expect(screen.getByRole('heading', { name: 'Libre Inversión' })).not.toBeNull();
        expect(screen.getByRole('heading', { name: 'Préstamo Auto' })).not.toBeNull();

        expect(screen.getByText(/Incluye abono extra: \+\$ 230\.000/i)).not.toBeNull();
      });
    });

    it('CA-04 & CA-05: Muestra intereses y fecha estimada por deuda, y fecha estimada global', async () => {
      setupAppContext('plus', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockPlusResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByText(/May de 2027/i)).not.toBeNull();
        expect(screen.getAllByText(/Sep de 2028/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/PROYECCIÓN ESTIMADA \(CEROA PLUS\)/i)).not.toBeNull();
      });
    });

    it('CA-06: Muestra comparativa factual Bola de Nieve vs Avalancha cuando está disponible', async () => {
      setupAppContext('plus', 'snowball');
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(mockPlusResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByText(/Comparativa: Bola de Nieve vs Avalancha/i)).not.toBeNull();
        expect(screen.getByText(/Avalancha ahorra \$ 350\.000 frente a Bola de Nieve/i)).not.toBeNull();
        expect(screen.getByText(/Diferencia de plazo: 2 mes\(es\)/i)).not.toBeNull();
      });
    });

    it('Muestra alerta de datos insuficientes si Avalancha tiene tasas no comparables', async () => {
      setupAppContext('plus', 'avalanche');
      const incompleteResponse: StrategyResponse = {
        ...mockPlusResponse,
        activeStrategy: 'avalanche',
        status: 'INSUFFICIENT_DATA',
        hasNonComparableDebts: true
      };
      vi.mocked(strategyService.getActiveStrategy).mockResolvedValue(incompleteResponse);

      render(<StrategicPlanView />);

      await waitFor(() => {
        expect(screen.getByText(/Existen obligaciones con tasa indexada o no disponible/i)).not.toBeNull();
      });
    });
  });
});
