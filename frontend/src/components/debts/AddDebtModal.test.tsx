// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AddDebtModal } from '../modals/AddDebtModal';
import * as AppContextModule from '../../context/AppContext';
import { ApiError } from '../../services/api';

describe('AddDebtModal - EP-06 (HU-023 a HU-033)', () => {
  afterEach(cleanup);

  const mockHandleAddDebt = vi.fn();
  const mockSetIsAddDebtOpen = vi.fn();
  const mockSetEditingDebtId = vi.fn();
  const mockSetIsSubscriptionModalOpen = vi.fn();
  const mockSetCurrentScreen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
      isAddDebtOpen: true,
      setIsAddDebtOpen: mockSetIsAddDebtOpen,
      editingDebtId: null,
      setEditingDebtId: mockSetEditingDebtId,
      debts: [],
      handleAddDebt: mockHandleAddDebt,
      setIsSubscriptionModalOpen: mockSetIsSubscriptionModalOpen,
      setCurrentScreen: mockSetCurrentScreen
    } as any);
  });

  describe('HU-023: Selector de tipo y validaciones comunes', () => {
    it('muestra exactamente los 10 tipos definidos y sin selector manual de estado', () => {
      render(<AddDebtModal />);

      const typeSelect = screen.getByLabelText(/Tipo de obligación financiera/i) as HTMLSelectElement;
      expect(typeSelect).not.toBeNull();

      const options = Array.from(typeSelect.options).map((o) => o.value);
      expect(options).toHaveLength(10);
      expect(options).toEqual([
        'credit_card',
        'personal_loan',
        'mortgage',
        'auto_loan',
        'student_loan',
        'retail_credit',
        'installment_purchase',
        'overdue_bill',
        'family_loan',
        'other'
      ]);

      // CA-07: No debe existir control para que el usuario asigne manualmente el estado de la deuda
      expect(screen.queryByLabelText(/Estado de la deuda/i)).toBeNull();
      expect(screen.queryByRole('combobox', { name: /Estado/i })).toBeNull();
    });

    it('exige nombre personalizado obligatorio', async () => {
      render(<AddDebtModal />);

      const submitBtn = screen.getByRole('button', { name: /Registrar obligación/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/El nombre personalizado es obligatorio/i)).not.toBeNull();
      expect(mockHandleAddDebt).not.toHaveBeenCalled();
    });

    it('al cambiar de tipo adapta los campos y limpia valores incompatibles (CA-02, TT-023.2)', () => {
      render(<AddDebtModal />);

      const typeSelect = screen.getByLabelText(/Tipo de obligación financiera/i);

      // Cambiar a Crédito hipotecario
      fireEvent.change(typeSelect, { target: { value: 'mortgage' } });
      expect(screen.getByText(/Modalidad y conceptos hipotecarios/i)).not.toBeNull();
      expect(screen.getByLabelText(/Modalidad de crédito/i)).not.toBeNull();

      // Cambiar a Factura vencida
      fireEvent.change(typeSelect, { target: { value: 'overdue_bill' } });
      expect(screen.queryByText(/Modalidad y conceptos hipotecarios/i)).toBeNull();
      expect(screen.getByLabelText(/Fecha original de vencimiento/i)).not.toBeNull();
    });
  });

  describe('HU-024: Tarjeta de crédito', () => {
    it('valida campos obligatorios y envía payload de tarjeta válido', async () => {
      mockHandleAddDebt.mockResolvedValueOnce(undefined);
      render(<AddDebtModal />);

      // Tarjeta es el default inicial
      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Visa Clásica' } });
      fireEvent.change(screen.getByLabelText(/Entidad o acreedor/i), { target: { value: 'Banco de Bogotá' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '1200000' } });
      fireEvent.change(screen.getByLabelText(/Cupo total/i), { target: { value: '5000000' } });
      fireEvent.change(screen.getByLabelText(/Valor de tasa/i), { target: { value: '28.5' } });
      fireEvent.change(screen.getByLabelText(/Pago mínimo mensual/i), { target: { value: '95000' } });
      fireEvent.change(screen.getByLabelText(/Fecha límite de pago/i), { target: { value: '2026-10-15' } });

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      await waitFor(() => {
        expect(mockHandleAddDebt).toHaveBeenCalledTimes(1);
      });

      const sentPayload = mockHandleAddDebt.mock.calls[0][0];
      expect(sentPayload.name).toBe('Visa Clásica');
      expect(sentPayload.type).toBe('credit_card');
      expect(sentPayload.originalAmount).toBe(5000000);
      expect(sentPayload.currentBalance).toBe(1200000);
      expect(sentPayload.minimumPayment).toBe(95000);
      // No debe contener status
      expect(sentPayload.status).toBeUndefined();
    });

    it('rechaza cupo disponible mayor al cupo total', async () => {
      render(<AddDebtModal />);

      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Tarjeta' } });
      fireEvent.change(screen.getByLabelText(/Entidad o acreedor/i), { target: { value: 'Banco' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '1000000' } });
      fireEvent.change(screen.getByLabelText(/Cupo total/i), { target: { value: '2000000' } });
      fireEvent.change(screen.getByLabelText(/Cupo disponible/i), { target: { value: '2500000' } });

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      expect(await screen.findByText(/El cupo disponible no puede superar el cupo total/i)).not.toBeNull();
      expect(mockHandleAddDebt).not.toHaveBeenCalled();
    });
  });

  describe('HU-025: Préstamo personal', () => {
    it('valida que saldo actual no supere valor inicial desembolsado', async () => {
      render(<AddDebtModal />);

      fireEvent.change(screen.getByLabelText(/Tipo de obligación financiera/i), {
        target: { value: 'personal_loan' }
      });

      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Préstamo Nómina' } });
      fireEvent.change(screen.getByLabelText(/Entidad o acreedor/i), { target: { value: 'Bancolombia' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '6000000' } });
      fireEvent.change(screen.getByLabelText(/Valor inicial desembolsado/i), { target: { value: '5000000' } });
      fireEvent.change(screen.getByLabelText(/Cuota vigente/i), { target: { value: '250000' } });
      fireEvent.change(screen.getByLabelText(/Fecha de desembolso/i), { target: { value: '2026-01-10' } });
      fireEvent.change(screen.getByLabelText(/Próximo vencimiento/i), { target: { value: '2026-10-15' } });

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      expect(await screen.findByText(/El saldo actual no puede superar el valor inicial/i)).not.toBeNull();
      expect(mockHandleAddDebt).not.toHaveBeenCalled();
    });
  });

  describe('HU-026: Crédito hipotecario / vivienda', () => {
    it('permite registrar hipotecario en modalidad Pesos y UVR', async () => {
      mockHandleAddDebt.mockResolvedValueOnce(undefined);
      render(<AddDebtModal />);

      fireEvent.change(screen.getByLabelText(/Tipo de obligación financiera/i), { target: { value: 'mortgage' } });
      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Apto 402' } });
      fireEvent.change(screen.getByLabelText(/Entidad o acreedor/i), { target: { value: 'Davivienda' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '140000000' } });
      fireEvent.change(screen.getByLabelText(/Valor financiado inicial/i), { target: { value: '150000000' } });
      fireEvent.change(screen.getByLabelText(/Cuota vigente/i), { target: { value: '1500000' } });
      fireEvent.change(screen.getByLabelText(/Valor de tasa/i), { target: { value: '13.5' } });
      fireEvent.change(screen.getByLabelText(/Próximo vencimiento/i), { target: { value: '2026-10-20' } });
      fireEvent.change(screen.getByLabelText(/Modalidad de crédito/i), { target: { value: 'UVR' } });

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      await waitFor(() => {
        expect(mockHandleAddDebt).toHaveBeenCalledTimes(1);
      });
      expect(mockHandleAddDebt.mock.calls[0][0].details.modality).toBe('UVR');
    });
  });

  describe('HU-028: Crédito educativo', () => {
    it('adapta la obligatoriedad de cuota según la etapa y cobro periódico', async () => {
      mockHandleAddDebt.mockResolvedValueOnce(undefined);
      render(<AddDebtModal />);

      fireEvent.change(screen.getByLabelText(/Tipo de obligación financiera/i), { target: { value: 'student_loan' } });
      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Icetex' } });
      fireEvent.change(screen.getByLabelText(/Entidad o acreedor/i), { target: { value: 'Icetex' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '18000000' } });
      fireEvent.change(screen.getByLabelText(/Valor financiado/i), { target: { value: '20000000' } });
      fireEvent.change(screen.getByLabelText(/Valor de tasa/i), { target: { value: '10.5' } });

      // Cambiar etapa a Estudio (sin cobro periódico)
      fireEvent.change(screen.getByLabelText(/Etapa contractual/i), { target: { value: 'ESTUDIO' } });

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      await waitFor(() => {
        expect(mockHandleAddDebt).toHaveBeenCalledTimes(1);
      });
      expect(mockHandleAddDebt.mock.calls[0][0].details.stage).toBe('ESTUDIO');
    });
  });

  describe('HU-029 & HU-030: Crédito comercial y Compra a cuotas', () => {
    it('soporta registrar costo financiero fijo en COP en lugar de porcentaje', async () => {
      mockHandleAddDebt.mockResolvedValueOnce(undefined);
      render(<AddDebtModal />);

      fireEvent.change(screen.getByLabelText(/Tipo de obligación financiera/i), { target: { value: 'retail_credit' } });
      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Nevera' } });
      fireEvent.change(screen.getByLabelText(/Entidad o acreedor/i), { target: { value: 'Alkosto' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '1500000' } });
      fireEvent.change(screen.getByLabelText(/Valor original/i), { target: { value: '2000000' } });
      fireEvent.change(screen.getByLabelText(/Cuota vigente/i), { target: { value: '200000' } });
      fireEvent.change(screen.getByLabelText(/Próximo vencimiento/i), { target: { value: '2026-10-15' } });

      // Seleccionar Costo Fijo (COP)
      fireEvent.click(screen.getByRole('button', { name: /Costo fijo \(COP\)/i }));
      fireEvent.change(screen.getByLabelText(/Costo financiero total pactado/i), { target: { value: '45000' } });

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      await waitFor(() => {
        expect(mockHandleAddDebt).toHaveBeenCalledTimes(1);
      });
      expect(mockHandleAddDebt.mock.calls[0][0].details.costType).toBe('FEE');
      expect(mockHandleAddDebt.mock.calls[0][0].details.financialCost).toBe(45000);
      expect(mockHandleAddDebt.mock.calls[0][0].rateType).toBe('NONE');
    });
  });

  describe('HU-032 & HU-033: Deuda familiar y Otra obligación', () => {
    it('permite omitir valor inicial y muestra información sobre limitación de proyecciones', async () => {
      mockHandleAddDebt.mockResolvedValueOnce(undefined);
      render(<AddDebtModal />);

      fireEvent.change(screen.getByLabelText(/Tipo de obligación financiera/i), { target: { value: 'family_loan' } });
      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Préstamo hermano' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '800000' } });

      // Verificar que el banner informativo de proyecciones está presente
      expect(screen.getByText(/Información para proyecciones/i)).not.toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      await waitFor(() => {
        expect(mockHandleAddDebt).toHaveBeenCalledTimes(1);
      });
      expect(mockHandleAddDebt.mock.calls[0][0].originalAmount).toBeUndefined();
    });
  });

  describe('Plan Cero: Manejo de error de negocio PLAN_CERO_DEBT_LIMIT', () => {
    it('muestra modal de límite alcanzado con CTA hacia Ceroa Plus al recibir PLAN_CERO_DEBT_LIMIT', async () => {
      mockHandleAddDebt.mockRejectedValueOnce(
        new ApiError('El plan Cero permite registrar máximo 2 deudas.', 422, 'PLAN_CERO_DEBT_LIMIT')
      );

      render(<AddDebtModal />);

      fireEvent.change(screen.getByLabelText(/Nombre personalizado/i), { target: { value: 'Tercera deuda' } });
      fireEvent.change(screen.getByLabelText(/Entidad o acreedor/i), { target: { value: 'Banco' } });
      fireEvent.change(screen.getByLabelText(/Saldo actual/i), { target: { value: '500000' } });
      fireEvent.change(screen.getByLabelText(/Cupo total/i), { target: { value: '1000000' } });
      fireEvent.change(screen.getByLabelText(/Valor de tasa/i), { target: { value: '25.0' } });
      fireEvent.change(screen.getByLabelText(/Pago mínimo mensual/i), { target: { value: '50000' } });
      fireEvent.change(screen.getByLabelText(/Fecha límite de pago/i), { target: { value: '2026-10-15' } });

      fireEvent.click(screen.getByRole('button', { name: /Registrar obligación/i }));

      expect(await screen.findByText(/Límite de obligaciones en Plan Cero/i)).not.toBeNull();
      expect(screen.getByText(/Conocer Ceroa Plus/i)).not.toBeNull();
    });
  });
});
