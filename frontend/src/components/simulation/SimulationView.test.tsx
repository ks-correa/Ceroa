// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SimulationView } from './SimulationView';
import * as AppContextModule from '../../context/AppContext';
import { simulationService } from '../../services/simulationService';
import { Debt, SimulationResponsePayload } from '../../types';

describe('EP-11 — Simulación de pagos (HU-045, HU-046, HU-047)', () => {
  afterEach(cleanup);

  const mockSetCurrentScreen = vi.fn();
  const mockShowToast = vi.fn();

  const sampleDebts: Debt[] = [
    {
      id: 'debt-1',
      name: 'Tarjeta Éxito',
      entity: 'Tuya',
      type: 'credit_card',
      categoryLabel: 'Tarjeta de crédito',
      originalAmount: 4000000,
      currentBalance: 3000000,
      interestRate: 25.0,
      rateType: 'EA',
      monthlyPayment: 250000,
      minimumPayment: 200000,
      dueDateDay: 15,
      nextDueDate: '2026-10-15',
      status: 'al_dia',
      paymentCount: 1
    },
    {
      id: 'debt-2',
      name: 'Crédito Libre Inversión',
      entity: 'Bancolombia',
      type: 'personal_loan',
      categoryLabel: 'Préstamo personal',
      originalAmount: 10000000,
      currentBalance: 8000000,
      interestRate: 18.0,
      rateType: 'EA',
      monthlyPayment: 450000,
      minimumPayment: 0,
      dueDateDay: 20,
      nextDueDate: '2026-10-20',
      status: 'al_dia',
      paymentCount: 2
    }
  ];

  const mockSimulationSuccessResponse: SimulationResponsePayload = {
    status: 'SUCCESS',
    statusReason: null,
    debt: {
      id: 'debt-1',
      name: 'Tarjeta Éxito',
      entity: 'Tuya',
      currentBalance: 3000000,
      interestRate: 25.0,
      rateType: 'EA',
      categoryLabel: 'Tarjeta de crédito'
    },
    simulatedStrategy: 'snowball',
    assumptions: [
      'Tasa fija estimada proyectada según las condiciones registradas de la obligación (25% EA).',
      'Semántica de cuota: cuando se modifica el pago mensual, la nueva cuota rige a partir de ese periodo en adelante.',
      'Los abonos adicionales hipotéticos se imputan íntegramente a capital en el periodo correspondiente.'
    ],
    baseline: {
      totalInterest: 420000,
      totalPrincipal: 3000000,
      estimatedMonths: 15,
      estimatedPayoffDate: 'Dic de 2027'
    },
    simulated: {
      totalInterest: 210000,
      totalPrincipal: 3000000,
      estimatedMonths: 9,
      estimatedPayoffDate: 'Jun de 2027'
    },
    differences: {
      monthsReduced: 6,
      estimatedInterestSavings: 210000
    },
    periods: [
      {
        period: 1,
        date: 'Oct 2026',
        openingBalance: 3000000,
        normalPayment: 250000,
        extraPayment: 500000,
        interest: 54000,
        principal: 696000,
        closingBalance: 2304000
      },
      {
        period: 2,
        date: 'Nov 2026',
        openingBalance: 2304000,
        normalPayment: 250000,
        extraPayment: 0,
        interest: 41472,
        principal: 208528,
        closingBalance: 2095472
      }
    ]
  };

  const setupContext = (plan: 'cero' | 'plus', debts: Debt[] = sampleDebts) => {
    vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
      debts,
      formatCurrency: (amount: number) => `$ ${amount.toLocaleString('es-CO')}`,
      formatNumber: (amount: number) => amount.toLocaleString('es-CO'),
      activeStrategy: 'snowball',
      showToast: mockShowToast,
      userProfile: {
        id: 'test-user',
        email: 'user@test.com',
        fullName: 'Usuario Prueba',
        plan,
        initialSetupComplete: true
      },
      setCurrentScreen: mockSetCurrentScreen,
      currency: 'COP'
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HU-045: Crear escenario de simulación', () => {
    it('CA-01: Usuario con Plan Cero ve la pantalla restringida y no puede simular', () => {
      setupContext('cero');
      render(<SimulationView />);

      expect(screen.getByText('Simular pagos es exclusivo de Ceroa Plus')).not.toBeNull();
      expect(screen.getByText('Conocer Ceroa Plus')).not.toBeNull();
      expect(screen.queryByText('Ajustes del escenario')).toBeNull();

      fireEvent.click(screen.getByText('Conocer Ceroa Plus'));
      expect(mockSetCurrentScreen).toHaveBeenCalledWith('subscription');
    });

    it('CA-02: Usuario con Plan Plus puede seleccionar obligación y estrategia de simulación', () => {
      setupContext('plus');
      render(<SimulationView />);

      expect(screen.getByText('Ajustes del escenario')).not.toBeNull();
      const debtSelect = screen.getByLabelText('Obligación a simular');
      expect(debtSelect).not.toBeNull();
      expect(screen.getByText(/Tarjeta Éxito/)).not.toBeNull();

      const snowballBtn = screen.getByRole('button', { name: 'Bola de Nieve' });
      const avalancheBtn = screen.getByRole('button', { name: 'Avalancha' });
      expect(snowballBtn).not.toBeNull();
      expect(avalancheBtn).not.toBeNull();

      // Cambiar a Avalancha
      fireEvent.click(avalancheBtn);
      expect(avalancheBtn.className).toContain('border-[var(--ceroa-primary)]');
    });

    it('CA-03 & CA-04: Permite agregar y eliminar múltiples eventos hipotéticos', () => {
      setupContext('plus');
      render(<SimulationView />);

      expect(screen.getByText('Evento #1')).not.toBeNull();
      expect(screen.queryByText('Evento #2')).toBeNull();

      // Agregar evento
      const addBtn = screen.getByRole('button', { name: /Agregar evento/ });
      fireEvent.click(addBtn);

      expect(screen.getByText('Evento #2')).not.toBeNull();

      // Eliminar evento 2
      const deleteBtn = screen.getByRole('button', { name: 'Eliminar evento 2' });
      fireEvent.click(deleteBtn);

      expect(screen.queryByText('Evento #2')).toBeNull();
    });

    it('CA-05: Validación local rechaza eventos con montos <= 0 o sin modificación', async () => {
      setupContext('plus');
      render(<SimulationView />);

      const executeBtn = screen.getByRole('button', { name: 'Ejecutar simulación' });
      fireEvent.click(executeBtn);

      // Debe exigir al menos un valor
      expect(screen.getByText('Ingresa al menos un abono adicional o una modificación de cuota.')).not.toBeNull();

      // Ingresar valor negativo
      const extraInput = screen.getByPlaceholderText('Ej. 500000');
      fireEvent.change(extraInput, { target: { value: '-1000' } });
      fireEvent.click(executeBtn);

      expect(screen.getByText('El abono adicional debe ser mayor que cero.')).not.toBeNull();
    });

    it('CA-06: Muestra estado de carga y procesa con backend sin proyecciones locales', async () => {
      setupContext('plus');
      const runSpy = vi.spyOn(simulationService, 'runSimulation').mockResolvedValueOnce(mockSimulationSuccessResponse);

      render(<SimulationView />);

      // Configurar evento válido
      const extraInput = screen.getByPlaceholderText('Ej. 500000');
      fireEvent.change(extraInput, { target: { value: '500000' } });

      const executeBtn = screen.getByRole('button', { name: 'Ejecutar simulación' });
      fireEvent.click(executeBtn);

      await waitFor(() => {
        expect(runSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            debtId: 'debt-1',
            strategy: 'snowball',
            events: [expect.objectContaining({ extraPayment: 500000, period: 1 })]
          })
        );
      });
    });
  });

  describe('HU-046: Comparar situación actual contra simulada', () => {
    it('CA-01 a CA-05: Muestra comparación Actual vs Simulado, diferencias y detalle por periodo', async () => {
      setupContext('plus');
      vi.spyOn(simulationService, 'runSimulation').mockResolvedValueOnce(mockSimulationSuccessResponse);

      render(<SimulationView />);

      const extraInput = screen.getByPlaceholderText('Ej. 500000');
      fireEvent.change(extraInput, { target: { value: '500000' } });

      const executeBtn = screen.getByRole('button', { name: 'Ejecutar simulación' });
      fireEvent.click(executeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Escenario simulado con éxito/)).not.toBeNull();
      });

      // Diferencias estimadas
      expect(screen.getByText('Ahorro Estimado en Intereses')).not.toBeNull();
      expect(screen.getAllByText('$ 210.000').length).toBeGreaterThan(0);
      expect(screen.getByText('6 meses antes')).not.toBeNull();

      // Comparación Actual vs Simulado
      expect(screen.getByText('Situación Actual (Línea Base)')).not.toBeNull();
      expect(screen.getByText('15 meses')).not.toBeNull();
      expect(screen.getByText('Dic de 2027')).not.toBeNull();

      expect(screen.getByText('Escenario Simulado')).not.toBeNull();
      expect(screen.getByText('9 meses')).not.toBeNull();
      expect(screen.getAllByText('Jun de 2027').length).toBeGreaterThan(0);

      // Detalle por periodo recibido
      expect(screen.getByText('Cronograma Detallado por Periodo')).not.toBeNull();
      expect(screen.getByText('#1')).not.toBeNull();
      expect(screen.getByText('#2')).not.toBeNull();
      expect(screen.getByText('+$500.000')).not.toBeNull();

      // Supuestos explícitos
      expect(screen.getByText('Supuestos financieros de la simulación')).not.toBeNull();
    });

    it('Maneja estado INSUFFICIENT_DATA con mensaje claro y sin cifras ficticias', async () => {
      setupContext('plus');
      vi.spyOn(simulationService, 'runSimulation').mockResolvedValueOnce({
        status: 'INSUFFICIENT_DATA',
        statusReason: 'La obligación tiene tasa indexada sin índice disponible.',
        debt: mockSimulationSuccessResponse.debt,
        simulatedStrategy: 'avalanche',
        assumptions: [],
        baseline: null,
        simulated: null,
        differences: null,
        periods: []
      });

      render(<SimulationView />);

      const extraInput = screen.getByPlaceholderText('Ej. 500000');
      fireEvent.change(extraInput, { target: { value: '500000' } });

      const executeBtn = screen.getByRole('button', { name: 'Ejecutar simulación' });
      fireEvent.click(executeBtn);

      await waitFor(() => {
        expect(screen.getByText('Datos insuficientes para simular')).not.toBeNull();
      });

      expect(screen.getByText('La obligación tiene tasa indexada sin índice disponible.')).not.toBeNull();
      // No debe mostrar tarjetas comparativas ficticias
      expect(screen.queryByText('Ahorro Estimado en Intereses')).toBeNull();
    });
  });

  describe('HU-047: Modificar o descartar escenario', () => {
    it('Permite modificar eventos y reejecutar la simulación con nuevos resultados', async () => {
      setupContext('plus');
      const runSpy = vi.spyOn(simulationService, 'runSimulation')
        .mockResolvedValueOnce(mockSimulationSuccessResponse)
        .mockResolvedValueOnce({
          ...mockSimulationSuccessResponse,
          differences: { monthsReduced: 8, estimatedInterestSavings: 300000 }
        });

      render(<SimulationView />);

      // 1. Primera ejecución
      const extraInput = screen.getByPlaceholderText('Ej. 500000');
      fireEvent.change(extraInput, { target: { value: '500000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar simulación' }));

      await waitFor(() => {
        expect(screen.getByText('6 meses antes')).not.toBeNull();
      });

      // 2. Modificar monto a 800000 y reejecutar
      fireEvent.change(extraInput, { target: { value: '800000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar simulación' }));

      await waitFor(() => {
        expect(screen.getByText('8 meses antes')).not.toBeNull();
      });

      expect(runSpy).toHaveBeenCalledTimes(2);
    });

    it('Descartar escenario limpia los resultados y resetea el estado sin mutar datos reales', async () => {
      setupContext('plus');
      vi.spyOn(simulationService, 'runSimulation').mockResolvedValueOnce(mockSimulationSuccessResponse);

      render(<SimulationView />);

      // Ejecutar simulación
      const extraInput = screen.getByPlaceholderText('Ej. 500000');
      fireEvent.change(extraInput, { target: { value: '500000' } });
      fireEvent.click(screen.getByRole('button', { name: 'Ejecutar simulación' }));

      await waitFor(() => {
        expect(screen.getByText(/Escenario simulado con éxito/)).not.toBeNull();
      });

      // Descartar
      const discardBtn = screen.getByRole('button', { name: 'Descartar' });
      fireEvent.click(discardBtn);

      // Debe volver al estado inicial EMPTY
      expect(screen.getByText('Escenario listo para configurar')).not.toBeNull();
      expect(screen.queryByText(/Escenario simulado con éxito/)).toBeNull();
      expect(mockShowToast).toHaveBeenCalledWith('Escenario hipotético descartado.');
    });
  });
});
