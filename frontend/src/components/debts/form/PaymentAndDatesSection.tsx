import React from 'react';
import { DebtFormState } from './debtTypeSchemas';
import { getTodayIsoDate } from '../../../utils/date';

interface PaymentAndDatesSectionProps {
  form: DebtFormState;
  errors: Record<string, string>;
  onFieldChange: <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) => void;
  onDetailChange: (key: string, value: any) => void;
}

export const PaymentAndDatesSection: React.FC<PaymentAndDatesSectionProps> = ({
  form,
  errors,
  onFieldChange,
  onDetailChange
}) => {
  const isCard = form.type === 'credit_card';
  const isPersonalLoan = form.type === 'personal_loan';
  const isMortgage = form.type === 'mortgage';
  const isAutoLoan = form.type === 'auto_loan';
  const isInstallmentDebt =
    form.type === 'personal_loan' ||
    form.type === 'mortgage' ||
    form.type === 'auto_loan' ||
    form.type === 'retail_credit' ||
    form.type === 'installment_purchase';
  const isFamilyOrOther = form.type === 'family_loan' || form.type === 'other';
  const isOverdueBill = form.type === 'overdue_bill';

  const inputClass = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border ${
      hasError
        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
        : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500 focus:border-teal-500'
    } rounded-xl focus:ring-2 focus:outline-none transition-all`;

  return (
    <div className="space-y-4">
      {/* 1. Cuota mensual o Pago Mínimo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isCard ? (
          <div>
            <label htmlFor="minimum-payment-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Pago mínimo mensual (COP) *
            </label>
            <input
              id="minimum-payment-input"
              type="number"
              min="0"
              step="any"
              value={form.minimumPayment !== undefined ? form.minimumPayment : ''}
              onChange={(e) => onFieldChange('minimumPayment', Number(e.target.value))}
              placeholder="0"
              aria-required="true"
              className={inputClass(Boolean(errors.minimumPayment))}
            />
            {errors.minimumPayment && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.minimumPayment}</p>
            )}
          </div>
        ) : !isOverdueBill ? (
          <div>
            <label htmlFor="monthly-payment-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isFamilyOrOther ? 'Cuota o pago acordado (COP, opcional)' : 'Cuota vigente (COP) *'}
            </label>
            <input
              id="monthly-payment-input"
              type="number"
              min="0"
              step="any"
              value={form.monthlyPayment || ''}
              onChange={(e) => onFieldChange('monthlyPayment', Number(e.target.value))}
              placeholder="0"
              aria-required={!isFamilyOrOther}
              className={inputClass(Boolean(errors.monthlyPayment))}
            />
            {errors.monthlyPayment && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.monthlyPayment}</p>
            )}
          </div>
        ) : null}

        {/* Fechas de Tarjeta: Fecha/Día de Corte y Fecha Límite */}
        {isCard && (
          <div>
            <label htmlFor="statement-day-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Día o fecha de corte *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                id="statement-day-input"
                type="number"
                min="1"
                max="31"
                value={form.details?.statementDay || form.dueDateDay || 15}
                onChange={(e) => {
                  const day = Number(e.target.value);
                  onFieldChange('dueDateDay', day);
                  onDetailChange('statementDay', day);
                }}
                placeholder="Día (1-31)"
                className={inputClass(Boolean(errors.statementDate))}
              />
              <input
                id="statement-date-input"
                type="date"
                value={form.details?.statementDate || ''}
                onChange={(e) => onDetailChange('statementDate', e.target.value)}
                className={inputClass(Boolean(errors.statementDate))}
              />
            </div>
            {errors.statementDate && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.statementDate}</p>
            )}
          </div>
        )}

        {/* Próximo vencimiento o fecha límite de pago */}
        {!isOverdueBill && (
          <div>
            <label htmlFor="next-due-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isCard
                ? 'Fecha límite de pago *'
                : isFamilyOrOther
                ? 'Próximo compromiso / vencimiento (opcional)'
                : 'Próximo vencimiento / fecha de pago *'}
            </label>
            <input
              id="next-due-date-input"
              type="date"
              value={form.nextDueDate || ''}
              onChange={(e) => {
                onFieldChange('nextDueDate', e.target.value);
                if (isCard) onDetailChange('paymentDueDate', e.target.value);
              }}
              aria-required={!isFamilyOrOther}
              className={inputClass(Boolean(errors.nextDueDate))}
            />
            {errors.nextDueDate && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.nextDueDate}</p>
            )}
          </div>
        )}
      </div>

      {/* 2. Plazos y Cuotas para Préstamos / Almacén / Cuotas */}
      {isInstallmentDebt && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="total-installments-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Plazo total o número total de cuotas *
            </label>
            <input
              id="total-installments-input"
              type="number"
              min="1"
              step="1"
              value={form.details?.totalInstallments || ''}
              onChange={(e) => onDetailChange('totalInstallments', Number(e.target.value))}
              placeholder="Ej. 36 o 180"
              className={inputClass(Boolean(errors.totalInstallments))}
            />
            {errors.totalInstallments && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.totalInstallments}</p>
            )}
          </div>

          <div>
            <label htmlFor="remaining-installments-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cuotas pendientes o plazo restante (meses) *
            </label>
            <input
              id="remaining-installments-input"
              type="number"
              min="0"
              step="1"
              value={form.termRemainingMonths !== undefined ? form.termRemainingMonths : ''}
              onChange={(e) => onFieldChange('termRemainingMonths', Number(e.target.value))}
              placeholder="Ej. 24"
              className={inputClass(Boolean(errors.termRemainingMonths))}
            />
            {errors.termRemainingMonths && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.termRemainingMonths}</p>
            )}
          </div>
        </div>
      )}

      {/* 3. Fecha de desembolso (para préstamo personal) y Fecha contractual opcional */}
      {(isPersonalLoan || isMortgage || isAutoLoan) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isPersonalLoan && (
            <div>
              <label htmlFor="disbursement-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha de desembolso *
              </label>
              <input
                id="disbursement-date-input"
                type="date"
                max={getTodayIsoDate()}
                value={form.disbursementDate || ''}
                onChange={(e) => onFieldChange('disbursementDate', e.target.value || undefined)}
                className={inputClass(Boolean(errors.disbursementDate))}
              />
              {errors.disbursementDate && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.disbursementDate}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="contractual-end-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fecha contractual de terminación (opcional)
            </label>
            <input
              id="contractual-end-date-input"
              type="date"
              value={String(form.details?.contractualEndDate || '')}
              onChange={(e) => onDetailChange('contractualEndDate', e.target.value)}
              className={inputClass(false)}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Fecha pactada en el contrato original. Ceroa la preservará como referencia contractual sin confundirla con proyecciones.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

