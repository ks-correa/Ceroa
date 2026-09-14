// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { DebtDetailView } from './DebtDetailView';
import { AddDebtModal } from '../modals/AddDebtModal';
import * as AppContextModule from '../../context/AppContext';
import { debtService } from '../../services/debtService';
import { Debt, PaymentRecord } from '../../types';

describe('EP-07 — Administración de obligaciones (HU-034, HU-035, HU-036)', () => {
  afterEach(cleanup);

  const mockSetCurrentScreen = vi.fn();
  const mockOpenRecordPaymentModal = vi.fn();
  const mockOpenEditDebtModal = vi.fn();
  const mockHandleDeleteDebt = vi.fn();
  const mockHandleDeletePayment = vi.fn();
  const mockHandleAddDebt = vi.fn();
  const mockSetIsAddDebtOpen = vi.fn();
  const mockSetEditingDebtId = vi.fn();

  const sampleCreditCard: Debt = {
    id: 'debt-card-1',
    name: 'Visa Platinum',
    entity: 'Banco de Bogotá',
    type: 'credit_card',
    categoryLabel: 'Tarjeta de crédito',
    originalAmount: 10000000,
    currentBalance: 3200000,
    interestRate: 27.5,
    rateType: 'EA',
    monthlyPayment: 0,
    minimumPayment: 210000,
    dueDateDay: 15,
    nextDueDate: '2026-10-15',
    status: 'al_dia',
    accountNumber: '**** 1234',
    notes: 'Tarjeta de compras recurrentes',
    details: {
      creditLimit: 10000000,
      availableCredit: 6800000,
      usedCredit: 3200000,
      statementDay: 15,
      paymentDueDate: '2026-10-15',
      managementFee: 28000
    },
    paymentCount: 2
  };

  const sampleMortgage: Debt = {
    id: 'debt-mortgage-2',
    name: 'Hipotecario Apto',
    entity: 'Davivienda',
    type: 'mortgage',
    categoryLabel: 'Crédito hipotecario',
    originalAmount: 150000000,
    currentBalance: 140000000,
    interestRate: 12.5,
    rateType: 'EA',
    monthlyPayment: 1500000,
    minimumPayment: 0,
    dueDateDay: 5,
    nextDueDate: '2026-10-05',
    termRemainingMonths: 180,
    status: 'al_dia',
    details: {
      modality: 'UVR',
      insuranceAmount: 85000
    },
    paymentCount: 0
  };

  const sampleOverdueBill: Debt = {
    id: 'debt-bill-3',
    name: 'Factura Internet',
    entity: 'Claro',
    type: 'overdue_bill',
    categoryLabel: 'Obligación vencida',
    originalAmount: 180000,
    currentBalance: 180000,
    interestRate: 0,
    rateType: 'NONE',
    monthlyPayment: 0,
    minimumPayment: 0,
    dueDateDay: 1,
    nextDueDate: '2026-08-01',
    status: 'en_mora',
    details: {
      originalDueDate: '2026-08-01',
      collectionCosts: 15000,
      penaltyRate: 2.5,
      penaltyRateType: 'MV'
    },
    paymentCount: 0
  };

  const samplePayments: PaymentRecord[] = [
    {
      id: 'pay-1',
      debtId: 'debt-card-1',
      debtName: 'Visa Platinum',
      amount: 500000,
      date: '2026-09-01',
      type: 'monthly_fee',
      typeLabel: 'Pago de cuota',
      status: 'completed',
      notes: 'Abono quincena'
    },
    {
      id: 'pay-2',
      debtId: 'debt-card-1',
      debtName: 'Visa Platinum',
      amount: 210000,
      date: '2026-08-15',
      type: 'minimum',
      typeLabel: 'Pago mínimo',
      status: 'completed',
      notes: 'Pago mínimo mensual'
    }
  ];

  const setupAppContext = (overrides = {}) => {
    vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
      selectedDebtId: 'debt-card-1',
      debts: [sampleCreditCard, sampleMortgage, sampleOverdueBill],
      payments: samplePayments,
      formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}`,
      formatNumber: (n: number) => n.toLocaleString('es-CO'),
      formatDate: (d: string | undefined) => d || '',
      setCurrentScreen: mockSetCurrentScreen,
      openRecordPaymentModal: mockOpenRecordPaymentModal,
      openEditDebtModal: mockOpenEditDebtModal,
      handleDeleteDebt: mockHandleDeleteDebt,
      handleDeletePayment: mockHandleDeletePayment,
      handleAddDebt: mockHandleAddDebt,
      isAddDebtOpen: false,
      setIsAddDebtOpen: mockSetIsAddDebtOpen,
      editingDebtId: null,
      setEditingDebtId: mockSetEditingDebtId,
      ...overrides
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // HU-034 — CONSULTAR DETALLE DE UNA DEUDA
  // =========================================================================
  describe('HU-034: Consultar detalle de una deuda', () => {
    it('TT-034.3: Muestra estado de carga mientras consulta el servicio', async () => {
      setupAppContext();
      vi.spyOn(debtService, 'getDebtById').mockReturnValue(new Promise(() => {})); // Never resolves
      vi.spyOn(debtService, 'getPayments').mockReturnValue(new Promise(() => {}));

      render(<DebtDetailView />);
      expect(screen.getByRole('status')).not.toBeNull();
      expect(screen.getByText(/Cargando detalle de la obligación/i)).not.toBeNull();
    });

    it('CA-01 & TT-034.1: Reconstruye campos generales y específicos de Tarjeta de Crédito', async () => {
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue(samplePayments);

      render(<DebtDetailView />);

      // General fields
      expect((await screen.findAllByText('Visa Platinum')).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Banco de Bogotá').length).toBeGreaterThan(0);
      expect(screen.getByText(/Tarjeta de compras recurrentes/i)).not.toBeNull();
      expect(screen.getByText(/Ref: \*\*\*\* 1234/i)).not.toBeNull();

      // Specific credit card fields
      expect(screen.getByText(/Cupo total/i)).not.toBeNull();
      expect(screen.getByText(/Cupo disponible/i)).not.toBeNull();
      expect(screen.getByText(/Cupo utilizado/i)).not.toBeNull();
      expect(screen.getByText(/Cuota de manejo mensual/i)).not.toBeNull();
      expect(screen.getByText(/Día de corte/i)).not.toBeNull();
    });

    it('CA-01 & TT-034.1: Reconstruye campos específicos de Crédito Hipotecario (modalidad UVR y seguros)', async () => {
      setupAppContext({ selectedDebtId: 'debt-mortgage-2' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleMortgage);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([]);

      render(<DebtDetailView />);

      expect(await screen.findByText('Hipotecario Apto')).not.toBeNull();
      expect(screen.getByText(/Modalidad de crédito/i)).not.toBeNull();
      expect(screen.getByText('UVR')).not.toBeNull();
      expect(screen.getByText(/Seguros asociados/i)).not.toBeNull();
      expect(screen.getByText(/Plazo restante/i)).not.toBeNull();
      expect(screen.getByText(/180 meses/i)).not.toBeNull();
    });

    it('CA-01 & CA-04: Representa el estado calculado recibido del backend sin permitir edición manual', async () => {
      setupAppContext({ selectedDebtId: 'debt-bill-3' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleOverdueBill);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([]);

      render(<DebtDetailView />);

      expect(await screen.findByText('Factura Internet')).not.toBeNull();
      expect(screen.getByText('En mora')).not.toBeNull();
      // No select or input for status
      expect(screen.queryByLabelText(/Editar estado/i)).toBeNull();
      expect(screen.queryByRole('combobox', { name: /Estado/i })).toBeNull();
    });

    it('CA-02 & TT-034.2: Si tiene pagos asociados, muestra historial completo con deuda relacionada y nota', async () => {
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue(samplePayments);

      render(<DebtDetailView />);

      expect(await screen.findByText('Historial de pagos')).not.toBeNull();
      expect(screen.getByText('Pago de cuota')).not.toBeNull();
      expect(screen.getByText('Pago mínimo')).not.toBeNull();
      // CA-02: Deuda relacionada visible en historial
      expect(screen.getAllByText('Visa Platinum').length).toBeGreaterThan(1);
      // CA-02: Nota visible en historial
      expect(screen.getByText('Abono quincena')).not.toBeNull();
      expect(screen.getByText('Pago mínimo mensual')).not.toBeNull();
    });

    it('CA-03: Si no existen pagos, muestra un estado vacío comprensible', async () => {
      setupAppContext({ selectedDebtId: 'debt-mortgage-2' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleMortgage);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([]);

      render(<DebtDetailView />);

      expect(await screen.findByText(/No hay registros de pago asociados a esta obligación/i)).not.toBeNull();
    });

    it('CA-05 & CA-06: Ante error o acceso no autorizado, muestra estado de error y no expone datos ficticios', async () => {
      setupAppContext({ selectedDebtId: 'unauthorized-debt-99' });
      vi.spyOn(debtService, 'getDebtById').mockRejectedValue(new Error('Deuda no encontrada o no autorizada'));
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([]);

      render(<DebtDetailView />);

      const alert = await screen.findByRole('alert');
      expect(alert).not.toBeNull();
      expect(screen.getByText(/Error al consultar la obligación/i)).not.toBeNull();
      expect(screen.getByText(/Deuda no encontrada o no autorizada/i)).not.toBeNull();

      // No financial figures displayed
      expect(screen.queryByText(/Saldo actual pendiente/i)).toBeNull();
      expect(screen.queryByText(/Visa Platinum/i)).toBeNull();

      // Button returns to debts list
      const backBtn = screen.getByRole('button', { name: /Volver a Mis Deudas/i });
      fireEvent.click(backBtn);
      expect(mockSetCurrentScreen).toHaveBeenCalledWith('debts');
    });

    it('Permite ocultar y mostrar el saldo mediante toggle', async () => {
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([]);

      render(<DebtDetailView />);

      expect((await screen.findAllByText(/\$?\s*3\.?200\.?000/)).length).toBeGreaterThan(0);

      const toggleBtn = screen.getByLabelText(/Ocultar saldo/i);
      fireEvent.click(toggleBtn);
      expect(screen.getAllByText('••••••••').length).toBeGreaterThan(0);

      fireEvent.click(screen.getByLabelText(/Mostrar saldo/i));
      expect(screen.getAllByText(/\$?\s*3\.?200\.?000/).length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // HU-035 — EDITAR UNA DEUDA
  // =========================================================================
  describe('HU-035: Editar una deuda', () => {
    it('TT-035.1 & TT-035.2: Botón editar abre modal con datos precargados y tipo de deuda protegido', async () => {
      setupAppContext({
        isAddDebtOpen: true,
        editingDebtId: 'debt-card-1',
        debts: [sampleCreditCard]
      });

      render(<AddDebtModal />);

      // Título en modo edición
      expect(screen.getByText(/Editar obligación financiera/i)).not.toBeNull();

      // Precarga de campos
      const nameInput = screen.getByLabelText(/Nombre personalizado de la deuda/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Visa Platinum');

      const entityInput = screen.getByLabelText(/Entidad o acreedor/i) as HTMLInputElement;
      expect(entityInput.value).toBe('Banco de Bogotá');

      const balanceInput = screen.getByLabelText(/Saldo actual/i) as HTMLInputElement;
      expect(balanceInput.value).toBe('3200000');

      // Tipo de deuda protegido (disabled) durante edición para preservar tipo
      const typeSelect = screen.getByLabelText(/Tipo de obligación financiera/i) as HTMLSelectElement;
      expect(typeSelect.disabled).toBe(true);
      expect(screen.getByText(/Tipo no modificable/i)).not.toBeNull();
    });

    it('CA-02 & CA-03: Aplica las mismas validaciones de EP-06 impidiendo enviar datos inválidos', async () => {
      setupAppContext({
        isAddDebtOpen: true,
        editingDebtId: 'debt-card-1',
        debts: [sampleCreditCard]
      });

      render(<AddDebtModal />);

      // Vaciar nombre obligatorio
      const nameInput = screen.getByLabelText(/Nombre personalizado de la deuda/i);
      fireEvent.change(nameInput, { target: { value: '' } });

      const submitBtn = screen.getByRole('button', { name: /Guardar cambios/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByText(/El nombre personalizado es obligatorio/i)).not.toBeNull();
      expect(mockHandleAddDebt).not.toHaveBeenCalled();
    });

    it('CA-04 & TT-035.3: Envía formulario editado y solo confirma tras respuesta exitosa', async () => {
      mockHandleAddDebt.mockResolvedValueOnce(undefined);
      setupAppContext({
        isAddDebtOpen: true,
        editingDebtId: 'debt-card-1',
        debts: [sampleCreditCard]
      });

      render(<AddDebtModal />);

      const nameInput = screen.getByLabelText(/Nombre personalizado de la deuda/i);
      fireEvent.change(nameInput, { target: { value: 'Visa Platinum Actualizada' } });

      const submitBtn = screen.getByRole('button', { name: /Guardar cambios/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockHandleAddDebt).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Visa Platinum Actualizada',
            type: 'credit_card',
            currentBalance: 3200000
          })
        );
      });
    });
  });

  // =========================================================================
  // HU-036 — ELIMINAR DEFINITIVAMENTE UNA DEUDA
  // =========================================================================
  describe('HU-036: Eliminar definitivamente una deuda', () => {
    it('CA-01 & CA-02 & TT-036.1: Al presionar eliminar muestra diálogo de confirmación explícito', async () => {
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue(samplePayments);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByRole('button', { name: /Eliminar deuda definitivamente/i });
      fireEvent.click(deleteBtn);

      const modal = screen.getByRole('dialog');
      expect(modal).not.toBeNull();
      expect(screen.getByText(/¿Eliminar definitivamente "Visa Platinum"?/i)).not.toBeNull();
      // CA-02: Indica claramente que la eliminación es definitiva
      expect(screen.getByText(/Esta acción es/i)).not.toBeNull();
      expect(screen.getAllByText(/definitiva/i).length).toBeGreaterThan(0);
    });

    it('CA-03 & TT-036.2: Si existen pagos asociados, muestra advertencia específica de eliminación de historial', async () => {
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue(samplePayments);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByRole('button', { name: /Eliminar deuda definitivamente/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByText(/Advertencia sobre historial de pagos/i)).not.toBeNull();
      expect(screen.getByText(/2 pago\(s\) asociados/i)).not.toBeNull();
      expect(screen.getByText(/también se eliminará definitivamente todo su historial de pagos/i)).not.toBeNull();
    });

    it('Deuda sin pagos no muestra la advertencia de pagos asociados', async () => {
      setupAppContext({ selectedDebtId: 'debt-mortgage-2' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleMortgage);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([]);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByRole('button', { name: /Eliminar deuda definitivamente/i });
      fireEvent.click(deleteBtn);

      expect(screen.queryByText(/Advertencia sobre historial de pagos/i)).toBeNull();
    });

    it('CA-04: Cancelar no elimina la deuda ni modifica información', async () => {
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue(samplePayments);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByRole('button', { name: /Eliminar deuda definitivamente/i });
      fireEvent.click(deleteBtn);

      const cancelBtn = screen.getByRole('button', { name: /^Cancelar$/i });
      fireEvent.click(cancelBtn);

      expect(screen.queryByRole('dialog')).toBeNull();
      expect(mockHandleDeleteDebt).not.toHaveBeenCalled();
      expect(screen.getAllByText('Visa Platinum').length).toBeGreaterThan(0);
    });

    it('CA-05 & TT-036.3: Confirmar eliminación ejecuta llamada a handleDeleteDebt', async () => {
      mockHandleDeleteDebt.mockResolvedValueOnce(undefined);
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue(samplePayments);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByRole('button', { name: /Eliminar deuda definitivamente/i });
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /Eliminar definitivamente/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockHandleDeleteDebt).toHaveBeenCalledWith('debt-card-1');
      });
    });

    it('CA-06: Si la eliminación falla en backend, muestra error y mantiene la información visible', async () => {
      mockHandleDeleteDebt.mockRejectedValueOnce(new Error('Error del servidor al eliminar la deuda'));
      setupAppContext({ selectedDebtId: 'debt-card-1' });
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleCreditCard);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue(samplePayments);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByRole('button', { name: /Eliminar deuda definitivamente/i });
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /Eliminar definitivamente/i });
      fireEvent.click(confirmBtn);

      expect(await screen.findByText('Error del servidor al eliminar la deuda')).not.toBeNull();
      expect(screen.getAllByText('Visa Platinum').length).toBeGreaterThan(0);
    });
  });
});
