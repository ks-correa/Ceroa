// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { FinancialSituationStep } from './steps/FinancialSituationStep';
import { TotalDeclaredDebtsStep } from './steps/TotalDeclaredDebtsStep';
import { SelectStrategyStep } from './steps/SelectStrategyStep';
import { ReviewStep } from './steps/ReviewStep';

describe('EP-05 Step Components', () => {
  afterEach(cleanup);

  const mockProfile = {
    monthlyIncome: 5000000,
    fixedExpenses: 2000000,
    availableMoney: 1000000,
    paymentCapacity: 1000000,
    capacityUsagePercentage: 20,
    totalDeclaredDebts: 3,
    registeredDebts: 1,
    incompleteCoverage: true,
    activeStrategy: 'snowball' as const
  };

  it('HU-018: FinancialSituationStep renders and validates inputs', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(
      <FinancialSituationStep
        initialProfile={mockProfile}
        onSave={handleSave}
        isSaving={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Situación financiera inicial/i })).not.toBeNull();
    expect((screen.getByLabelText(/Ingresos mensuales/i) as HTMLInputElement).value).toBe('5000000');

    const incomeInput = screen.getByLabelText(/Ingresos mensuales/i);
    const expensesInput = screen.getByLabelText(/Gastos esenciales mensuales/i);

    fireEvent.change(incomeInput, { target: { value: '2000000' } });
    fireEvent.change(expensesInput, { target: { value: '3000000' } });

    const form = screen.getByRole('button', { name: /Guardar y continuar/i }).closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByText(/Gastos esenciales no pueden superar/i)).not.toBeNull();
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('HU-019: TotalDeclaredDebtsStep renders and validates integer', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TotalDeclaredDebtsStep
        initialDeclaredDebts={3}
        userPlan="cero"
        onSave={handleSave}
        onBack={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Cantidad total de deudas/i })).not.toBeNull();
    const input = screen.getByLabelText(/¿Cuántas deudas tienes en total\?/i) as HTMLInputElement;
    expect(input.value).toBe('3');

    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(5);
    });
  });

  it('HU-021: SelectStrategyStep selects strategy and saves', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);
    render(
      <SelectStrategyStep
        initialStrategy="snowball"
        onSave={handleSave}
        onBack={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Selecciona tu estrategia de pago inicial/i })).not.toBeNull();
    fireEvent.click(screen.getByText(/Avalancha/i));
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/i }));

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith('avalanche');
    });
  });

  it('HU-022: ReviewStep displays summary and partial coverage warning', async () => {
    const handleComplete = vi.fn().mockResolvedValue(undefined);
    const mockDebts = [
      {
        id: 'debt-1',
        name: 'Tarjeta Credito',
        entity: 'Banco X',
        type: 'credit_card' as const,
        categoryLabel: 'Tarjeta de crédito',
        originalAmount: 5000000,
        currentBalance: 3000000,
        interestRate: 28.5,
        rateType: 'EA' as const,
        monthlyPayment: 250000,
        minimumPayment: 150000,
        dueDateDay: 15,
        nextDueDate: '2026-10-15',
        status: 'al_dia' as const
      }
    ];

    render(
      <ReviewStep
        financialProfile={mockProfile}
        debts={mockDebts}
        onComplete={handleComplete}
        onGoToStep={vi.fn()}
        onBack={vi.fn()}
        isSubmitting={false}
      />
    );

    expect(screen.getByRole('heading', { name: /Revisar y finalizar configuración/i })).not.toBeNull();
    expect(screen.getByText(/Advertencia de cobertura parcial/i)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar y finalizar configuración/i }));

    await waitFor(() => {
      expect(handleComplete).toHaveBeenCalled();
    });
  });
});
