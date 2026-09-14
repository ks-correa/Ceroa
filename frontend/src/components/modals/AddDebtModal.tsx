import React, { useEffect, useState } from 'react';
import { Landmark, X, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CreateDebtPayload, DebtType } from '../../types';
import {
  cleanIncompatibleValues,
  DEBT_TYPES,
  DebtFormState,
  getInitialFormForType
} from '../debts/form/debtTypeSchemas';
import { CommonFieldsSection } from '../debts/form/CommonFieldsSection';
import { RateSection } from '../debts/form/RateSection';
import { PaymentAndDatesSection } from '../debts/form/PaymentAndDatesSection';
import { TypeSpecificSection } from '../debts/form/TypeSpecificSection';
import { ApiError } from '../../services/api';

export const AddDebtModal: React.FC = () => {
  const {
    isAddDebtOpen,
    setIsAddDebtOpen,
    editingDebtId,
    setEditingDebtId,
    debts,
    handleAddDebt,
    setIsSubscriptionModalOpen,
    setCurrentScreen
  } = useApp();

  const [form, setForm] = useState<DebtFormState>(() => getInitialFormForType('credit_card'));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPlanCeroLimitReached, setIsPlanCeroLimitReached] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAddDebtOpen) return;
    const debt = debts.find((item) => item.id === editingDebtId);
    if (debt) {
      setForm({
        name: debt.name,
        entity: debt.entity || '',
        type: debt.type,
        categoryLabel: debt.categoryLabel,
        originalAmount: debt.originalAmount,
        currentBalance: debt.currentBalance,
        interestRate: debt.interestRate || 0,
        rateType: debt.rateType,
        monthlyPayment: debt.monthlyPayment || 0,
        minimumPayment: debt.minimumPayment || 0,
        dueDateDay: debt.dueDateDay || 15,
        nextDueDate: debt.nextDueDate || '',
        disbursementDate: debt.disbursementDate,
        termRemainingMonths: debt.termRemainingMonths || 0,
        accountNumber: debt.accountNumber || '',
        notes: debt.notes || '',
        color: debt.color || '#008FA6',
        details: debt.details || {}
      });
    } else {
      setForm(getInitialFormForType('credit_card'));
    }
    setFieldErrors({});
    setGeneralError(null);
    setIsPlanCeroLimitReached(false);
  }, [isAddDebtOpen, editingDebtId, debts]);

  if (!isAddDebtOpen) return null;

  const close = () => {
    setIsAddDebtOpen(false);
    setEditingDebtId(null);
    setIsPlanCeroLimitReached(false);
  };

  const handleTypeChange = (newType: DebtType) => {
    setForm((current) => cleanIncompatibleValues(current, newType));
    setFieldErrors({});
    setGeneralError(null);
  };

  const setField = <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const setDetail = (key: string, value: any) => {
    setForm((current) => ({
      ...current,
      details: { ...current.details, [key]: value }
    }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const schema = DEBT_TYPES.find((t) => t.value === form.type) || DEBT_TYPES[0];

    // Nombre
    if (!form.name.trim()) {
      errors.name = 'El nombre personalizado es obligatorio.';
    }

    // Entidad
    if (schema.requiresEntity && !form.entity.trim()) {
      errors.entity = 'La entidad o acreedor es obligatorio.';
    }

    // Saldo actual
    if (form.type === 'credit_card') {
      if (form.currentBalance < 0) {
        errors.currentBalance = 'El saldo actual no puede ser negativo.';
      }
    } else {
      if (!form.currentBalance || form.currentBalance <= 0) {
        errors.currentBalance = 'El saldo actual debe ser mayor a 0.';
      }
    }

    // Monto original / cupo total
    if (form.type === 'credit_card') {
      const limit = form.originalAmount || Number(form.details?.creditLimit);
      if (!limit || limit <= 0) {
        errors.originalAmount = 'El cupo total es obligatorio y debe ser mayor a 0.';
      }
      if (form.minimumPayment === undefined || form.minimumPayment < 0) {
        errors.minimumPayment = 'El pago mínimo es obligatorio y no puede ser negativo.';
      }
      if (!form.details?.statementDate && !form.details?.statementDay && !form.dueDateDay) {
        errors.statementDate = 'La fecha o día de corte es obligatorio.';
      }
      if (!form.nextDueDate && !form.details?.paymentDueDate) {
        errors.nextDueDate = 'La fecha límite de pago es obligatoria.';
      }
      const available = form.details?.availableCredit;
      if (available !== undefined && limit && available > limit) {
        errors.availableCredit = 'El cupo disponible no puede superar el cupo total.';
      }
      const used = form.details?.usedCredit;
      if (used !== undefined && limit && used > limit) {
        errors.usedCredit = 'El cupo utilizado no puede superar el cupo total.';
      }
    } else if (!schema.isOriginalAmountOptional) {
      if (!form.originalAmount || form.originalAmount <= 0) {
        errors.originalAmount = `${schema.originalAmountLabel || 'El valor original'} debe ser mayor a 0.`;
      }
      if (form.type === 'personal_loan' && form.currentBalance > (form.originalAmount || 0)) {
        errors.currentBalance = 'El saldo actual no puede superar el valor inicial desembolsado.';
      }
    } else if (form.originalAmount !== undefined && form.originalAmount <= 0) {
      errors.originalAmount = 'Si ingresas un valor inicial, debe ser mayor a 0.';
    }

    // Tasa / Costo
    const costType = form.details?.costType;
    if (costType === 'FEE' || costType === 'FIXED_FEE') {
      const fee = Number(form.details?.financialCost || form.details?.fixedFee);
      if (!fee || fee <= 0) {
        errors.fixedFee = 'El costo o tarifa fija en COP debe ser mayor a 0.';
      }
    } else if (form.rateType !== 'NONE') {
      if (!form.interestRate || form.interestRate <= 0) {
        if (!form.details?.interestMargin || Number(form.details?.interestMargin) <= 0) {
          errors.interestRate = 'Debes ingresar un valor de tasa mayor a 0.';
        }
      }
    }

    // Cuota y vencimiento para tipos regulares
    if (
      form.type === 'personal_loan' ||
      form.type === 'mortgage' ||
      form.type === 'auto_loan' ||
      form.type === 'retail_credit' ||
      form.type === 'installment_purchase'
    ) {
      if (!form.monthlyPayment || form.monthlyPayment <= 0) {
        errors.monthlyPayment = 'El valor de la cuota debe ser mayor a 0.';
      }
      if (!form.nextDueDate) {
        errors.nextDueDate = 'El próximo vencimiento es obligatorio.';
      }
    }

    // Préstamo personal: fecha desembolso
    if (form.type === 'personal_loan' && !form.disbursementDate) {
      errors.disbursementDate = 'La fecha de desembolso es obligatoria.';
    }

    // Hipotecario: modalidad
    if (form.type === 'mortgage') {
      const mod = form.details?.modality;
      if (mod !== 'PESOS' && mod !== 'UVR') {
        errors.modality = 'Debes seleccionar Pesos o UVR.';
      }
    }

    // Educativo: etapa y pago exigible
    if (form.type === 'student_loan') {
      const stage = form.details?.stage;
      if (!stage || (stage !== 'ESTUDIO' && stage !== 'GRACIA' && stage !== 'AMORTIZACION')) {
        errors.stage = 'La etapa es obligatoria.';
      }
      const isExigible = Boolean(form.details?.hasPaymentObligation);
      if (isExigible) {
        if (!form.monthlyPayment || form.monthlyPayment <= 0) {
          errors.monthlyPayment = 'La cuota es obligatoria para etapas con cobro periódico.';
        }
        if (!form.nextDueDate) {
          errors.nextDueDate = 'El próximo vencimiento es obligatorio cuando hay cobro exigible.';
        }
      }
    }

    // Factura vencida
    if (form.type === 'overdue_bill') {
      if (!form.details?.originalDueDate && !form.disbursementDate) {
        errors.originalDueDate = 'La fecha original de vencimiento es obligatoria.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      setGeneralError('Por favor revisa los campos señalados antes de continuar.');
      return;
    }

    try {
      setSaving(true);
      const isCard = form.type === 'credit_card';
      const creditLimit = isCard ? (form.originalAmount || form.details?.creditLimit) : form.originalAmount;

      const payload: CreateDebtPayload = {
        name: form.name.trim(),
        entity: form.entity.trim(),
        type: form.type,
        categoryLabel: form.categoryLabel,
        originalAmount: creditLimit ? Number(creditLimit) : undefined,
        currentBalance: form.currentBalance,
        interestRate: form.rateType === 'NONE' ? 0 : form.interestRate,
        rateType: form.rateType,
        monthlyPayment: form.monthlyPayment,
        minimumPayment: isCard ? form.minimumPayment : 0,
        dueDateDay: form.dueDateDay,
        nextDueDate: form.nextDueDate || undefined,
        disbursementDate: form.disbursementDate,
        termRemainingMonths: form.termRemainingMonths,
        accountNumber: form.accountNumber,
        notes: form.notes,
        color: form.color,
        details: form.details
      };

      await handleAddDebt(payload);
      close();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'PLAN_CERO_DEBT_LIMIT') {
        setIsPlanCeroLimitReached(true);
      } else {
        setGeneralError(cause instanceof Error ? cause.message : 'No fue posible guardar la deuda.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-modal-title"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 id="debt-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingDebtId ? 'Editar obligación financiera' : 'Registrar obligación financiera'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ingresa únicamente los datos aplicables al tipo de deuda seleccionado.
                </p>
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Cerrar modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {generalError && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            {/* 1. Campos Comunes y Selector de 10 tipos */}
            <CommonFieldsSection
              form={form}
              errors={fieldErrors}
              onTypeChange={handleTypeChange}
              onFieldChange={setField}
              isEditing={Boolean(editingDebtId)}
            />

            {/* 2. Sección de Tasas y Costos */}
            <RateSection
              form={form}
              errors={fieldErrors}
              onFieldChange={setField}
              onDetailChange={setDetail}
            />

            {/* 3. Pagos y Fechas */}
            <PaymentAndDatesSection
              form={form}
              errors={fieldErrors}
              onFieldChange={setField}
              onDetailChange={setDetail}
            />

            {/* 4. Sección Específica por Tipo */}
            <TypeSpecificSection
              form={form}
              errors={fieldErrors}
              onFieldChange={setField}
              onDetailChange={setDetail}
            />

            {/* Notas y referencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label htmlFor="debt-account-ref-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Referencia o N° de cuenta (opcional)
                </label>
                <input
                  id="debt-account-ref-input"
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => setField('accountNumber', e.target.value)}
                  placeholder="Últimos 4 dígitos o ref."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="debt-notes-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notas adicionales (opcional)
                </label>
                <input
                  id="debt-notes-input"
                  type="text"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Detalles recordatorios"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>{saving ? 'Guardando...' : editingDebtId ? 'Guardar cambios' : 'Registrar obligación'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal / Alerta de Límite del Plan Cero */}
      {isPlanCeroLimitReached && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-cero-limit-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 id="plan-cero-limit-title" className="text-base font-bold text-slate-900 dark:text-white">
                Límite de obligaciones en Plan Cero
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Tu cuenta actual en el <strong>Plan Cero</strong> permite registrar un máximo de <strong>2 obligaciones financieras</strong>. Tus dos deudas registradas se mantienen intactas.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Para registrar más deudas y tener seguimiento ilimitado de tu portafolio, actualiza a <strong>Ceroa Plus</strong>.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsPlanCeroLimitReached(false);
                  close();
                  if (setIsSubscriptionModalOpen) {
                    setIsSubscriptionModalOpen(true);
                  } else {
                    setCurrentScreen('subscription');
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-teal-700 to-cyan-600 hover:from-teal-800 hover:to-cyan-700 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Conocer Ceroa Plus</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPlanCeroLimitReached(false)}
                className="w-full py-2 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Continuar con mis 2 deudas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
