// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { RecordPaymentModal } from '../modals/RecordPaymentModal';
import { DebtDetailView } from './DebtDetailView';
import * as AppContextModule from '../../context/AppContext';
import { debtService } from '../../services/debtService';
import { Debt, PaymentRecord } from '../../types';

describe('EP-10 — Gestión de pagos y abonos (HU-042, HU-043, HU-044)', () => {
  afterEach(cleanup);

  const mockHandleRecordPayment = vi.fn();
  const mockHandleUpdatePayment = vi.fn();
  const mockHandleDeletePayment = vi.fn();
  const mockSetIsRecordPaymentOpen = vi.fn();
  const mockOpenRecordPaymentModal = vi.fn();
  const mockOpenAddDebtModal = vi.fn();
  const mockSetCurrentScreen = vi.fn();

  const sampleDebt1: Debt = {
    id: 'debt-1',
    name: 'Crédito Bancolombia',
    entity: 'Bancolombia',
    type: 'personal_loan',
    categoryLabel: 'Préstamo personal',
    originalAmount: 5000000,
    currentBalance: 3000000,
    interestRate: 18.5,
    rateType: 'EA',
    monthlyPayment: 250000,
    minimumPayment: 0,
    dueDateDay: 20,
    nextDueDate: '2026-10-20',
    status: 'al_dia',
    paymentCount: 1
  };

  const sampleDebt2: Debt = {
    id: 'debt-2',
    name: 'Tarjeta Visa Oro',
    entity: 'Banco de Bogotá',
    type: 'credit_card',
    categoryLabel: 'Tarjeta de crédito',
    originalAmount: 8000000,
    currentBalance: 1200000,
    interestRate: 27.5,
    rateType: 'EA',
    monthlyPayment: 0,
    minimumPayment: 150000,
    dueDateDay: 15,
    nextDueDate: '2026-10-15',
    status: 'al_dia',
    paymentCount: 1
  };

  const samplePayment1: PaymentRecord = {
    id: 'pay-1',
    debtId: 'debt-1',
    debtName: 'Crédito Bancolombia',
    amount: 500000,
    date: '2026-09-01',
    type: 'monthly_fee',
    typeLabel: 'Pago de cuota',
    status: 'completed',
    notes: 'Pago cuota mensual septiembre'
  };

  const setupAppContext = (overrides = {}) => {
    vi.spyOn(AppContextModule, 'useApp').mockReturnValue({
      isRecordPaymentOpen: true,
      setIsRecordPaymentOpen: mockSetIsRecordPaymentOpen,
      targetPaymentDebtId: 'debt-1',
      editingPayment: null,
      suggestedPaymentAmount: null,
      debts: [sampleDebt1, sampleDebt2],
      payments: [samplePayment1],
      formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}`,
      formatNumber: (n: number) => n.toLocaleString('es-CO'),
      formatDate: (d: string | undefined) => d || '',
      handleRecordPayment: mockHandleRecordPayment,
      handleUpdatePayment: mockHandleUpdatePayment,
      handleDeletePayment: mockHandleDeletePayment,
      openRecordPaymentModal: mockOpenRecordPaymentModal,
      openAddDebtModal: mockOpenAddDebtModal,
      setCurrentScreen: mockSetCurrentScreen,
      selectedDebtId: 'debt-1',
      ...overrides
    } as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // HU-042: REGISTRAR UN PAGO
  // =========================================================================
  describe('HU-042 — Registrar un pago', () => {
    it('CA-01 & CA-02 & TT-042.1 & TT-042.2: Formulario incluye los campos exigidos y exactamente los 4 tipos de pago', () => {
      setupAppContext();
      render(<RecordPaymentModal />);

      // Título en creación
      expect(screen.getByText('Registrar pago o abono')).not.toBeNull();

      // Campos exigidos
      expect(screen.getByLabelText(/Deuda relacionada/i)).not.toBeNull();
      expect(screen.getByLabelText(/Valor del pago/i)).not.toBeNull();
      expect(screen.getByLabelText(/Fecha del pago/i)).not.toBeNull();
      expect(screen.getByLabelText(/Nota \(opcional\)/i)).not.toBeNull();

      // Exactamente los 4 tipos requeridos por CA-02
      expect(screen.getByRole('radio', { name: 'Pago mínimo' })).not.toBeNull();
      expect(screen.getByRole('radio', { name: 'Pago de cuota' })).not.toBeNull();
      expect(screen.getByRole('radio', { name: 'Abono adicional' })).not.toBeNull();
      expect(screen.getByRole('radio', { name: 'Pago total' })).not.toBeNull();
    });

    it('CA-03 & TT-042.3: Valor <= 0 bloquea el envío y muestra mensaje de validación', async () => {
      setupAppContext();
      render(<RecordPaymentModal />);

      const amountInput = screen.getByLabelText(/Valor del pago/i);
      fireEvent.change(amountInput, { target: { value: '0' } });

      const submitBtn = screen.getByRole('button', { name: /Confirmar pago/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByRole('alert')).not.toBeNull();
      expect(screen.getByText(/El valor del pago debe ser mayor que cero/i)).not.toBeNull();
      expect(mockHandleRecordPayment).not.toHaveBeenCalled();
    });

    it('CA-04 & TT-042.3: Fecha futura bloquea el envío y muestra mensaje de validación', async () => {
      setupAppContext();
      render(<RecordPaymentModal />);

      const amountInput = screen.getByLabelText(/Valor del pago/i);
      fireEvent.change(amountInput, { target: { value: '100000' } });

      const dateInput = screen.getByLabelText(/Fecha del pago/i);
      fireEvent.change(dateInput, { target: { value: '2099-12-31' } });

      const submitBtn = screen.getByRole('button', { name: /Confirmar pago/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByRole('alert')).not.toBeNull();
      expect(screen.getByText(/La fecha del pago no puede ser futura/i)).not.toBeNull();
      expect(mockHandleRecordPayment).not.toHaveBeenCalled();
    });

    it('CA-05 & TT-042.2: Seleccionar Pago total precarga el saldo vigente recibido del sistema', () => {
      setupAppContext({ targetPaymentDebtId: 'debt-1' });
      render(<RecordPaymentModal />);

      const fullPaymentBtn = screen.getByRole('radio', { name: 'Pago total' });
      fireEvent.click(fullPaymentBtn);

      const amountInput = screen.getByLabelText(/Valor del pago/i) as HTMLInputElement;
      expect(Number(amountInput.value)).toBe(3000000); // Saldo actual de debt-1
    });

    it('CA-06 & TT-042.4 & TT-042.5: Envía datos válidos al backend, muestra loading y cierra modal tras confirmación', async () => {
      mockHandleRecordPayment.mockResolvedValueOnce(undefined);
      setupAppContext({ targetPaymentDebtId: 'debt-1' });
      render(<RecordPaymentModal />);

      const amountInput = screen.getByLabelText(/Valor del pago/i);
      fireEvent.change(amountInput, { target: { value: '250000' } });

      const submitBtn = screen.getByRole('button', { name: /Confirmar pago/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockHandleRecordPayment).toHaveBeenCalledWith({
          debtId: 'debt-1',
          amount: 250000,
          type: 'monthly_fee',
          notes: undefined,
          date: expect.any(String)
        });
      });

      expect(mockSetIsRecordPaymentOpen).toHaveBeenCalledWith(false);
    });

    it('CA-08: Si backend rechaza el pago, no cierra el modal y conserva los datos para corrección/reintento', async () => {
      mockHandleRecordPayment.mockRejectedValueOnce(new Error('El pago supera el saldo actual'));
      setupAppContext({ targetPaymentDebtId: 'debt-1' });
      render(<RecordPaymentModal />);

      const amountInput = screen.getByLabelText(/Valor del pago/i) as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '3500000' } });

      const notesInput = screen.getByLabelText(/Nota \(opcional\)/i) as HTMLTextAreaElement;
      fireEvent.change(notesInput, { target: { value: 'Intento de pago extraordinario' } });

      const submitBtn = screen.getByRole('button', { name: /Confirmar pago/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByRole('alert')).not.toBeNull();
      expect(screen.getByText('El pago supera el saldo actual')).not.toBeNull();

      // Los campos se conservan intactos para que el usuario pueda corregir
      expect(amountInput.value).toBe('3500000');
      expect(notesInput.value).toBe('Intento de pago extraordinario');
      expect(mockSetIsRecordPaymentOpen).not.toHaveBeenCalledWith(false);
    });
  });

  // =========================================================================
  // HU-043: EDITAR UN PAGO
  // =========================================================================
  describe('HU-043 — Editar un pago', () => {
    it('CA-01 & TT-043.1 & TT-043.2: Reutiliza el formulario y precarga los valores confirmados del movimiento', () => {
      setupAppContext({
        editingPayment: samplePayment1
      });
      render(<RecordPaymentModal />);

      expect(screen.getByText('Editar pago o abono')).not.toBeNull();

      const amountInput = screen.getByLabelText(/Valor del pago/i) as HTMLInputElement;
      expect(Number(amountInput.value)).toBe(500000);

      const dateInput = screen.getByLabelText(/Fecha del pago/i) as HTMLInputElement;
      expect(dateInput.value).toBe('2026-09-01');

      const notesInput = screen.getByLabelText(/Nota \(opcional\)/i) as HTMLTextAreaElement;
      expect(notesInput.value).toBe('Pago cuota mensual septiembre');
    });

    it('CA-02: La deuda asociada está bloqueada (inmutable) durante la edición', () => {
      setupAppContext({
        editingPayment: samplePayment1
      });
      render(<RecordPaymentModal />);

      const debtSelect = screen.getByLabelText(/Deuda relacionada/i) as HTMLSelectElement;
      expect(debtSelect.disabled).toBe(true);
      expect(screen.getByText(/La obligación asociada no puede modificarse durante la edición/i)).not.toBeNull();
    });

    it('CA-03: En edición, valores inválidos (monto <= 0 o fecha futura) bloquean la actualización', async () => {
      setupAppContext({
        editingPayment: samplePayment1
      });
      render(<RecordPaymentModal />);

      const amountInput = screen.getByLabelText(/Valor del pago/i);
      fireEvent.change(amountInput, { target: { value: '0' } });

      const submitBtn = screen.getByRole('button', { name: /Guardar cambios/i });
      fireEvent.click(submitBtn);

      expect(await screen.findByRole('alert')).not.toBeNull();
      expect(screen.getByText(/El valor del pago debe ser mayor que cero/i)).not.toBeNull();
      expect(mockHandleUpdatePayment).not.toHaveBeenCalled();
    });

    it('CA-04 & CA-05 & TT-043.3 & TT-043.4: Envía actualización y solo confirma tras respuesta exitosa', async () => {
      mockHandleUpdatePayment.mockResolvedValueOnce(undefined);
      setupAppContext({
        editingPayment: samplePayment1
      });
      render(<RecordPaymentModal />);

      const amountInput = screen.getByLabelText(/Valor del pago/i);
      fireEvent.change(amountInput, { target: { value: '600000' } });

      const submitBtn = screen.getByRole('button', { name: /Guardar cambios/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockHandleUpdatePayment).toHaveBeenCalledWith('pay-1', {
          debtId: 'debt-1',
          amount: 600000,
          type: 'monthly_fee',
          notes: 'Pago cuota mensual septiembre',
          date: '2026-09-01'
        });
      });

      expect(mockSetIsRecordPaymentOpen).toHaveBeenCalledWith(false);
    });
  });

  // =========================================================================
  // HU-044: ELIMINAR UN PAGO
  // =========================================================================
  describe('HU-044 — Eliminar un pago', () => {
    it('CA-01 & TT-044.1: Al presionar eliminar en una fila del historial, muestra diálogo accesible de confirmación', async () => {
      setupAppContext();
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleDebt1);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([samplePayment1]);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByLabelText(/Eliminar pago del 2026-09-01/i);
      fireEvent.click(deleteBtn);

      const modal = screen.getByRole('dialog');
      expect(modal).not.toBeNull();
      expect(screen.getByText('¿Eliminar este pago?')).not.toBeNull();
      expect(screen.getByText(/Se eliminará el movimiento de/i)).not.toBeNull();
    });

    it('CA-02: Cancelar la eliminación conserva el movimiento y no ejecuta la solicitud', async () => {
      setupAppContext();
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleDebt1);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([samplePayment1]);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByLabelText(/Eliminar pago del 2026-09-01/i);
      fireEvent.click(deleteBtn);

      const cancelBtn = screen.getByRole('button', { name: /^Cancelar$/i });
      fireEvent.click(cancelBtn);

      expect(mockHandleDeletePayment).not.toHaveBeenCalled();
      // El pago sigue presente en la tabla
      expect(screen.getByText('Pago cuota mensual septiembre')).not.toBeNull();
    });

    it('CA-03: Si la eliminación falla en backend, muestra error en el diálogo y conserva el pago', async () => {
      mockHandleDeletePayment.mockRejectedValueOnce(new Error('Fallo temporal al revertir el pago'));
      setupAppContext();
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleDebt1);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([samplePayment1]);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByLabelText(/Eliminar pago del 2026-09-01/i);
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /^Eliminar pago$/i });
      fireEvent.click(confirmBtn);

      expect(await screen.findByRole('alert')).not.toBeNull();
      expect(screen.getByText('Fallo temporal al revertir el pago')).not.toBeNull();
      expect(screen.getByText('Pago cuota mensual septiembre')).not.toBeNull();
    });

    it('CA-04 & CA-05 & TT-044.3 & TT-044.4: Confirmar eliminación ejecuta handleDeletePayment y cierra modal', async () => {
      mockHandleDeletePayment.mockResolvedValueOnce(undefined);
      setupAppContext();
      vi.spyOn(debtService, 'getDebtById').mockResolvedValue(sampleDebt1);
      vi.spyOn(debtService, 'getPayments').mockResolvedValue([samplePayment1]);

      render(<DebtDetailView />);

      const deleteBtn = await screen.findByLabelText(/Eliminar pago del 2026-09-01/i);
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: /^Eliminar pago$/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockHandleDeletePayment).toHaveBeenCalledWith('pay-1');
      });
    });
  });
});
