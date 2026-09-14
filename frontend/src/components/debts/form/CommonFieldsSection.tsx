import React from 'react';
import { DebtType } from '../../../types';
import { DEBT_TYPES, DebtFormState } from './debtTypeSchemas';
import { CreditCard, Landmark, Home, Car, GraduationCap, Store, ShoppingBag, AlertOctagon, Users, FileText } from 'lucide-react';

interface CommonFieldsSectionProps {
  form: DebtFormState;
  errors: Record<string, string>;
  onTypeChange: (type: DebtType) => void;
  onFieldChange: <K extends keyof DebtFormState>(key: K, value: DebtFormState[K]) => void;
}

export const CommonFieldsSection: React.FC<CommonFieldsSectionProps> = ({
  form,
  errors,
  onTypeChange,
  onFieldChange
}) => {
  const currentSchema = DEBT_TYPES.find((t) => t.value === form.type) || DEBT_TYPES[0];

  const getTypeIcon = (type: DebtType) => {
    switch (type) {
      case 'credit_card': return <CreditCard className="w-4 h-4 text-teal-600 dark:text-cyan-400" />;
      case 'personal_loan': return <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'mortgage': return <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'auto_loan': return <Car className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'student_loan': return <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'retail_credit': return <Store className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'installment_purchase': return <ShoppingBag className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
      case 'overdue_bill': return <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'family_loan': return <Users className="w-4 h-4 text-teal-600 dark:text-cyan-400" />;
      default: return <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border ${
      hasError
        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
        : 'border-slate-200 dark:border-slate-700 focus:ring-teal-500 focus:border-teal-500'
    } rounded-xl focus:ring-2 focus:outline-none transition-all`;

  return (
    <div className="space-y-4">
      {/* 1. Selector de Tipo de Obligación (HU-023: Exactamente 10 tipos) */}
      <div>
        <label htmlFor="debt-type-select" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
          Tipo de obligación financiera *
        </label>
        <div className="relative">
          <select
            id="debt-type-select"
            aria-label="Tipo de obligación financiera"
            value={form.type}
            onChange={(e) => onTypeChange(e.target.value as DebtType)}
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none text-slate-900 dark:text-white"
          >
            {DEBT_TYPES.map((typeOption) => (
              <option key={typeOption.value} value={typeOption.value}>
                {typeOption.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
          {getTypeIcon(form.type)}
          <span>{currentSchema.description}</span>
        </p>
      </div>

      {/* 2. Nombre personalizado y Entidad / Acreedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="debt-name-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nombre personalizado de la deuda *
          </label>
          <input
            id="debt-name-input"
            type="text"
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            placeholder="Ej. Tarjeta principal, Crédito moto"
            aria-required="true"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'debt-name-error' : undefined}
            className={inputClass(Boolean(errors.name))}
          />
          {errors.name && (
            <p id="debt-name-error" className="text-[11px] text-rose-500 mt-1">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="debt-entity-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {currentSchema.requiresEntity ? 'Entidad o acreedor *' : 'Acreedor o persona (opcional)'}
          </label>
          <input
            id="debt-entity-input"
            type="text"
            value={form.entity}
            onChange={(e) => onFieldChange('entity', e.target.value)}
            placeholder={
              form.type === 'family_loan'
                ? 'Ej. Familiar, amigo'
                : form.type === 'other'
                ? 'Ej. Particular o entidad'
                : 'Ej. Bancolombia, Alkosto, Icetex'
            }
            aria-required={currentSchema.requiresEntity}
            aria-invalid={Boolean(errors.entity)}
            aria-describedby={errors.entity ? 'debt-entity-error' : undefined}
            className={inputClass(Boolean(errors.entity))}
          />
          {errors.entity && (
            <p id="debt-entity-error" className="text-[11px] text-rose-500 mt-1">
              {errors.entity}
            </p>
          )}
        </div>
      </div>

      {/* 3. Saldo actual y Monto Original / Cupo Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="debt-current-balance-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Saldo actual (COP) *
          </label>
          <input
            id="debt-current-balance-input"
            type="number"
            min={form.type === 'credit_card' ? 0 : 0.01}
            step="any"
            value={form.currentBalance || ''}
            onChange={(e) => onFieldChange('currentBalance', e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
            aria-required="true"
            aria-invalid={Boolean(errors.currentBalance)}
            aria-describedby={errors.currentBalance ? 'debt-current-balance-error' : undefined}
            className={inputClass(Boolean(errors.currentBalance))}
          />
          {errors.currentBalance && (
            <p id="debt-current-balance-error" className="text-[11px] text-rose-500 mt-1">
              {errors.currentBalance}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="debt-original-amount-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {currentSchema.originalAmountLabel || 'Valor original (COP)'}{' '}
            {currentSchema.isOriginalAmountOptional ? '' : '*'}
          </label>
          <input
            id="debt-original-amount-input"
            type="number"
            min="0"
            step="any"
            value={form.originalAmount !== undefined ? form.originalAmount : ''}
            onChange={(e) =>
              onFieldChange(
                'originalAmount',
                e.target.value === '' ? (currentSchema.isOriginalAmountOptional ? undefined : 0) : Number(e.target.value)
              )
            }
            placeholder={currentSchema.isOriginalAmountOptional ? 'Opcional si no se conoce' : '0'}
            aria-required={!currentSchema.isOriginalAmountOptional}
            aria-invalid={Boolean(errors.originalAmount)}
            aria-describedby={errors.originalAmount ? 'debt-original-amount-error' : undefined}
            className={inputClass(Boolean(errors.originalAmount))}
          />
          {errors.originalAmount && (
            <p id="debt-original-amount-error" className="text-[11px] text-rose-500 mt-1">
              {errors.originalAmount}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

