import React from 'react';
import { DebtFormState } from './debtTypeSchemas';
import { Info } from 'lucide-react';

interface TypeSpecificSectionProps {
  form: DebtFormState;
  errors: Record<string, string>;
  onFieldChange: <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) => void;
  onDetailChange: (key: string, value: any) => void;
  preserveUnknownDefaults?: boolean;
}

export const TypeSpecificSection: React.FC<TypeSpecificSectionProps> = ({
  form,
  errors,
  onFieldChange,
  onDetailChange,
  preserveUnknownDefaults = false
}) => {
  const inputClass = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border ${
      hasError
        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
        : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500 focus:border-teal-500'
    } rounded-xl focus:ring-2 focus:outline-none transition-all`;

  // 1. Tarjeta de crédito (HU-024)
  if (form.type === 'credit_card') {
    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Detalles de la tarjeta de crédito
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="available-credit-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cupo disponible (COP, opcional)
            </label>
            <input
              id="available-credit-input"
              type="number"
              min="0"
              value={form.details?.availableCredit !== undefined ? form.details.availableCredit : ''}
              onChange={(e) => onDetailChange('availableCredit', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="Ej. 6500000"
              className={inputClass(Boolean(errors.availableCredit))}
            />
            {errors.availableCredit && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.availableCredit}</p>
            )}
          </div>

          <div>
            <label htmlFor="used-credit-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cupo utilizado (COP, opcional)
            </label>
            <input
              id="used-credit-input"
              type="number"
              min="0"
              value={form.details?.usedCredit !== undefined ? form.details.usedCredit : ''}
              onChange={(e) => onDetailChange('usedCredit', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="Ej. 1500000"
              className={inputClass(Boolean(errors.usedCredit))}
            />
            {errors.usedCredit && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.usedCredit}</p>
            )}
          </div>

          <div>
            <label htmlFor="management-fee-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cuota de manejo mensual (COP, opcional)
            </label>
            <input
              id="management-fee-input"
              type="number"
              min="0"
              value={form.details?.managementFee !== undefined ? form.details.managementFee : ''}
              onChange={(e) => onDetailChange('managementFee', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="0"
              className={inputClass(false)}
            />
          </div>

          <div>
            <label htmlFor="overdue-balance-card-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Saldo vencido o en mora (COP, opcional)
            </label>
            <input
              id="overdue-balance-card-input"
              type="number"
              min="0"
              value={form.details?.overdueBalance !== undefined ? form.details.overdueBalance : ''}
              onChange={(e) => onDetailChange('overdueBalance', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="0"
              className={inputClass(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. Crédito hipotecario / vivienda (HU-026)
  if (form.type === 'mortgage') {
    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Modalidad y conceptos hipotecarios
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="mortgage-modality-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Modalidad de crédito *
            </label>
            <select
              id="mortgage-modality-select"
              value={String(form.details?.modality || (preserveUnknownDefaults ? '' : 'PESOS'))}
              onChange={(e) => onDetailChange('modality', e.target.value)}
              className={inputClass(Boolean(errors.modality))}
            >
              {preserveUnknownDefaults && <option value="">Selecciona modalidad</option>}
              <option value="PESOS">Pesos</option>
              <option value="UVR">UVR</option>
            </select>
          </div>

          <div>
            <label htmlFor="mortgage-insurance-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Seguros mensuales asociados (COP, opcional)
            </label>
            <input
              id="mortgage-insurance-input"
              type="number"
              min="0"
              value={form.details?.insuranceAmount !== undefined ? form.details.insuranceAmount : ''}
              onChange={(e) => onDetailChange('insuranceAmount', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="0"
              className={inputClass(false)}
            />
          </div>

          <div>
            <label htmlFor="mortgage-overdue-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Saldo en mora (COP, opcional)
            </label>
            <input
              id="mortgage-overdue-input"
              type="number"
              min="0"
              value={form.details?.overdueBalance !== undefined ? form.details.overdueBalance : ''}
              onChange={(e) => onDetailChange('overdueBalance', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="0"
              className={inputClass(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  // 3. Crédito de vehículo (HU-027)
  if (form.type === 'auto_loan') {
    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
        <label htmlFor="residual-value-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Pago final extraordinario / valor residual (COP, opcional)
        </label>
        <input
          id="residual-value-input"
          type="number"
          min="0"
          value={form.details?.residualValue !== undefined ? form.details.residualValue : ''}
          onChange={(e) => onDetailChange('residualValue', e.target.value === '' ? undefined : Number(e.target.value))}
          placeholder="0 si no aplica pago final"
          className={inputClass(false)}
        />
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Si el crédito incluye una cuota balón o residual al final del plazo, ingrésala aquí.
        </p>
      </div>
    );
  }

  // 4. Crédito educativo (HU-028)
  if (form.type === 'student_loan') {
    const stage = String(form.details?.stage || (preserveUnknownDefaults ? '' : 'AMORTIZACION'));
    const hasPaymentObligation = Boolean(form.details?.hasPaymentObligation ?? (stage === 'AMORTIZACION'));

    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Etapa del crédito educativo
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="student-stage-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Etapa contractual *
            </label>
            <select
              id="student-stage-select"
              value={stage}
              onChange={(e) => {
                const newStage = e.target.value;
                onDetailChange('stage', newStage);
                // Adaptar pago exigible según la etapa
                const shouldPay = newStage === 'AMORTIZACION';
                onDetailChange('hasPaymentObligation', shouldPay);
              }}
              className={inputClass(Boolean(errors.stage))}
            >
              {preserveUnknownDefaults && <option value="">Selecciona etapa</option>}
              <option value="ESTUDIO">Estudio (en época lectiva)</option>
              <option value="GRACIA">Gracia / período de espera</option>
              <option value="AMORTIZACION">Amortización (cobro de cuotas)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={hasPaymentObligation}
                onChange={(e) => onDetailChange('hasPaymentObligation', e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>Existe cobro periódico exigible actualmente</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {hasPaymentObligation
                ? 'La cuota y el próximo vencimiento son obligatorios.'
                : 'En esta etapa la cuota periódica y el vencimiento pueden omitirse.'}
            </p>
          </div>
        </div>

        {hasPaymentObligation && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label htmlFor="student-cuota-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cuota mensual exigible (COP) *
              </label>
              <input
                id="student-cuota-input"
                type="number"
                min="0.01"
                value={form.monthlyPayment || ''}
                onChange={(e) => onFieldChange('monthlyPayment', Number(e.target.value))}
                placeholder="0"
                className={inputClass(Boolean(errors.monthlyPayment))}
              />
              {errors.monthlyPayment && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.monthlyPayment}</p>
              )}
            </div>

            <div>
              <label htmlFor="student-next-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Próximo vencimiento exigible *
              </label>
              <input
                id="student-next-date-input"
                type="date"
                value={form.nextDueDate || ''}
                onChange={(e) => onFieldChange('nextDueDate', e.target.value)}
                className={inputClass(Boolean(errors.nextDueDate))}
              />
              {errors.nextDueDate && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.nextDueDate}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. Factura u obligación vencida (HU-031)
  if (form.type === 'overdue_bill') {
    const hasAgreement = Boolean(form.details?.hasPaymentAgreement);

    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Detalles de la obligación vencida
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="original-due-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Fecha original de vencimiento *
            </label>
            <input
              id="original-due-date-input"
              type="date"
              value={String(form.details?.originalDueDate || form.disbursementDate || '')}
              onChange={(e) => {
                onDetailChange('originalDueDate', e.target.value);
                onFieldChange('disbursementDate', e.target.value || undefined);
              }}
              className={inputClass(Boolean(errors.originalDueDate))}
            />
            {errors.originalDueDate && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.originalDueDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="collection-costs-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gastos de cobranza (COP, opcional)
            </label>
            <input
              id="collection-costs-input"
              type="number"
              min="0"
              value={form.details?.collectionCosts !== undefined ? form.details.collectionCosts : ''}
              onChange={(e) => onDetailChange('collectionCosts', e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="0"
              className={inputClass(false)}
            />
          </div>

          <div>
            <label htmlFor="penalty-rate-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tasa de mora (% mes, opcional)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                id="penalty-rate-input"
                type="number"
                min="0"
                step="0.01"
                value={form.details?.penaltyRate !== undefined ? form.details.penaltyRate : ''}
                onChange={(e) => onDetailChange('penaltyRate', e.target.value === '' ? undefined : Number(e.target.value))}
                placeholder="%"
                className={inputClass(Boolean(errors.penaltyRate))}
              />
              <select
                id="penalty-rate-type-select"
                aria-label="Tipo de tasa de mora"
                value={String(form.details?.penaltyRateType || (preserveUnknownDefaults ? '' : 'MV'))}
                onChange={(e) => onDetailChange('penaltyRateType', e.target.value)}
                className={inputClass(false)}
              >
                {preserveUnknownDefaults && <option value="">Selecciona modalidad</option>}
                <option value="MV">M.V.</option>
                <option value="EA">E.A.</option>
              </select>
            </div>
          </div>
        </div>

        {/* Acuerdo de pago opcional */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ¿Existe un acuerdo o compromiso de pago formal?
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Existe acuerdo de pago"
                checked={hasAgreement}
                onChange={(e) => onDetailChange('hasPaymentAgreement', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {hasAgreement && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="agreed-amount-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valor acordado (COP)
                </label>
                <input
                  id="agreed-amount-input"
                  type="number"
                  min="0"
                  value={form.details?.agreedPaymentAmount || ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onDetailChange('agreedPaymentAmount', val);
                    onFieldChange('monthlyPayment', val);
                  }}
                  placeholder="0"
                  className={inputClass(false)}
                />
              </div>

              <div>
                <label htmlFor="agreed-periodicity-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Periodicidad
                </label>
                <select
                  id="agreed-periodicity-select"
                  value={String(form.details?.paymentPeriodicity || (preserveUnknownDefaults ? '' : 'MENSUAL'))}
                  onChange={(e) => onDetailChange('paymentPeriodicity', e.target.value)}
                  className={inputClass(false)}
                >
                  {preserveUnknownDefaults && <option value="">Selecciona periodicidad</option>}
                  <option value="MENSUAL">Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="UNICO">Pago único</option>
                </select>
              </div>

              <div>
                <label htmlFor="agreed-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Próximo compromiso
                </label>
                <input
                  id="agreed-date-input"
                  type="date"
                  value={String(form.details?.nextAgreementCommitmentDate || form.nextDueDate || '')}
                  onChange={(e) => {
                    onDetailChange('nextAgreementCommitmentDate', e.target.value);
                    onFieldChange('nextDueDate', e.target.value);
                  }}
                  className={inputClass(false)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6. Deuda Familiar o Amigo / Otra Obligación (HU-032 & HU-033)
  if (form.type === 'family_loan' || form.type === 'other') {
    const hasAgreement = Boolean(form.details?.hasAgreement);

    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Acuerdo de pago y proyecciones
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              ¿Existe un acuerdo de cuota o fecha de pago?
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Existe acuerdo de cuota o fecha"
                checked={hasAgreement}
                onChange={(e) => onDetailChange('hasAgreement', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {hasAgreement ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label htmlFor="fam-cuota-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cuota / Abono periódico (COP)
                </label>
                <input
                  id="fam-cuota-input"
                  type="number"
                  min="0"
                  value={form.monthlyPayment || ''}
                  onChange={(e) => onFieldChange('monthlyPayment', Number(e.target.value))}
                  placeholder="0"
                  className={inputClass(false)}
                />
              </div>

              <div>
                <label htmlFor="fam-periodicity-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Periodicidad
                </label>
                <select
                  id="fam-periodicity-select"
                  value={String(form.details?.periodicity || (preserveUnknownDefaults ? '' : 'MENSUAL'))}
                  onChange={(e) => onDetailChange('periodicity', e.target.value)}
                  className={inputClass(false)}
                >
                  <option value="MENSUAL">Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                  {preserveUnknownDefaults && <option value="">Selecciona periodicidad</option>}
                  <option value="EVENTUAL">Sin periodicidad fija</option>
                </select>
              </div>

              <div>
                <label htmlFor="fam-date-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Próximo compromiso
                </label>
                <input
                  id="fam-date-input"
                  type="date"
                  value={form.nextDueDate || ''}
                  onChange={(e) => onFieldChange('nextDueDate', e.target.value)}
                  className={inputClass(false)}
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Información para proyecciones:</strong> Al no tener una cuota o fecha definida, Ceroa registrará la deuda en tu saldo general pero no podrá calcular un calendario de amortización ni proyectar fechas de liquidación exactas.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
