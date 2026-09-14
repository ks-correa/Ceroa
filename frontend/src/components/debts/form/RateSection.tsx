import React from 'react';
import { RateType } from '../../../types';
import { DebtFormState, RATE_OPTIONS } from './debtTypeSchemas';

interface RateSectionProps {
  form: DebtFormState;
  errors: Record<string, string>;
  onFieldChange: <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) => void;
  onDetailChange: (key: string, value: any) => void;
}

export const RateSection: React.FC<RateSectionProps> = ({
  form,
  errors,
  onFieldChange,
  onDetailChange
}) => {
  const isFamilyOrOther = form.type === 'family_loan' || form.type === 'other';
  const isCommercialOrInstallment = form.type === 'retail_credit' || form.type === 'installment_purchase';

  const inputClass = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border ${
      hasError
        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
        : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500 focus:border-teal-500'
    } rounded-xl focus:ring-2 focus:outline-none transition-all`;

  // 1. Para Deuda Familiar u Otra Obligación: Selector con/sin intereses
  if (isFamilyOrOther) {
    const hasInterest = form.rateType !== 'NONE';

    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              ¿Esta obligación genera intereses?
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Si no se pactaron intereses formales, no se exigirá tasa.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              aria-label="Tiene intereses"
              checked={hasInterest}
              onChange={(e) => {
                const checked = e.target.checked;
                onFieldChange('rateType', checked ? 'EA' : 'NONE');
                if (!checked) onFieldChange('interestRate', 0);
                onDetailChange('hasInterest', checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        {hasInterest && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label htmlFor="family-rate-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de tasa *
              </label>
              <select
                id="family-rate-type"
                value={form.rateType}
                onChange={(e) => onFieldChange('rateType', e.target.value as RateType)}
                className={inputClass(Boolean(errors.rateType))}
              >
                {RATE_OPTIONS.filter((o) => o.value !== 'NONE').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="family-rate-value" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor de tasa (%) *
              </label>
              <input
                id="family-rate-value"
                type="number"
                min="0.0001"
                step="0.0001"
                value={form.interestRate || ''}
                onChange={(e) => onFieldChange('interestRate', Number(e.target.value))}
                placeholder="Ej. 1.5"
                className={inputClass(Boolean(errors.interestRate))}
              />
              {errors.interestRate && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.interestRate}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Para Crédito Comercial o Compra a Cuotas: Diferenciar Tasa vs Costo Financiero Fijo (COP)
  if (isCommercialOrInstallment) {
    const costType = String(form.details?.costType || 'RATE');

    return (
      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
            Modalidad de interés o costo financiero *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                onDetailChange('costType', 'RATE');
                onFieldChange('rateType', 'EA');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                costType === 'RATE'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Tasa (%)
            </button>
            <button
              type="button"
              onClick={() => {
                onDetailChange('costType', form.type === 'retail_credit' ? 'FEE' : 'FIXED_FEE');
                onFieldChange('rateType', 'NONE');
                onFieldChange('interestRate', 0);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                costType !== 'RATE' && costType !== 'NONE'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {form.type === 'retail_credit' ? 'Costo fijo (COP)' : 'Tarifa fija (COP)'}
            </button>
            <button
              type="button"
              onClick={() => {
                onDetailChange('costType', 'NONE');
                onFieldChange('rateType', 'NONE');
                onFieldChange('interestRate', 0);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                costType === 'NONE'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              0% Sin intereses
            </button>
          </div>
        </div>

        {costType === 'RATE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label htmlFor="commercial-rate-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de tasa *
              </label>
              <select
                id="commercial-rate-type"
                value={form.rateType}
                onChange={(e) => onFieldChange('rateType', e.target.value as RateType)}
                className={inputClass(Boolean(errors.rateType))}
              >
                {RATE_OPTIONS.filter((o) => o.value !== 'NONE').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="commercial-rate-value" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor de tasa (%) *
              </label>
              <input
                id="commercial-rate-value"
                type="number"
                min="0.0001"
                step="0.0001"
                value={form.interestRate || ''}
                onChange={(e) => onFieldChange('interestRate', Number(e.target.value))}
                placeholder="Ej. 25.4"
                className={inputClass(Boolean(errors.interestRate))}
              />
              {errors.interestRate && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.interestRate}</p>
              )}
            </div>
          </div>
        )}

        {(costType === 'FEE' || costType === 'FIXED_FEE') && (
          <div className="pt-2">
            <label htmlFor="fixed-fee-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {form.type === 'retail_credit' ? 'Costo financiero total pactado (COP) *' : 'Tarifa fija cobrada (COP) *'}
            </label>
            <input
              id="fixed-fee-input"
              type="number"
              min="0.01"
              step="any"
              value={form.details?.financialCost || form.details?.fixedFee || ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (form.type === 'retail_credit') {
                  onDetailChange('financialCost', val);
                } else {
                  onDetailChange('fixedFee', val);
                }
              }}
              placeholder="Ej. 45000"
              className={inputClass(Boolean(errors.fixedFee || errors.financialCost))}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Se registrará como un costo monetario fijo en COP y no como un porcentaje de tasa de interés.
            </p>
          </div>
        )}
      </div>
    );
  }

  // 3. Para demás tipos (Tarjeta, Personal, Hipotecario, Vehículo, Educativo, Factura): Selector de Tasas estándar
  const isIndexed =
    form.rateType === 'INDEXED' ||
    form.rateType === 'IBR_MARGIN' ||
    form.rateType === 'IPC_MARGIN' ||
    form.rateType === 'UVR_MARGIN';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="standard-rate-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Tipo de tasa *
        </label>
        <select
          id="standard-rate-type"
          value={form.rateType}
          onChange={(e) => {
            const newRateType = e.target.value as RateType;
            onFieldChange('rateType', newRateType);
            if (newRateType === 'NONE') onFieldChange('interestRate', 0);
          }}
          className={inputClass(Boolean(errors.rateType))}
        >
          {RATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="standard-rate-value" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {isIndexed ? 'Margen o valor de tasa (%) *' : 'Valor de tasa (%) *'}
        </label>
        <input
          id="standard-rate-value"
          type="number"
          min="0"
          step="0.0001"
          disabled={form.rateType === 'NONE'}
          value={form.rateType === 'NONE' ? 0 : form.interestRate || ''}
          onChange={(e) => {
            const val = Number(e.target.value);
            onFieldChange('interestRate', val);
            if (isIndexed) onDetailChange('interestMargin', val);
          }}
          placeholder={form.rateType === 'NONE' ? '0' : 'Ej. 28.5'}
          className={`${inputClass(Boolean(errors.interestRate))} disabled:opacity-50`}
        />
        {errors.interestRate && (
          <p className="text-[11px] text-rose-500 mt-1">{errors.interestRate}</p>
        )}
      </div>

      {isIndexed && (
        <div className="sm:col-span-2 p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs">
          <label htmlFor="reference-index-input" className="block text-xs font-semibold text-cyan-900 dark:text-cyan-200 mb-1">
            Índice de referencia indexado
          </label>
          <input
            id="reference-index-input"
            type="text"
            value={String(form.details?.referenceIndex || '')}
            onChange={(e) => onDetailChange('referenceIndex', e.target.value)}
            placeholder="Ej. IBR, IPC o UVR"
            className={inputClass(false)}
          />
        </div>
      )}
    </div>
  );
};

