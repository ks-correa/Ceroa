import React, { useEffect, useState } from 'react';
import { Landmark, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Debt, DebtType, RateType } from '../../types';
import { getTodayIsoDate } from '../../utils/date';

const TYPE_OPTIONS: { value: DebtType; label: string; category: string }[] = [
  { value: 'credit_card', label: 'Tarjeta de crédito', category: 'Tarjeta de crédito' },
  { value: 'personal_loan', label: 'Préstamo personal / libre inversión', category: 'Préstamo personal' },
  { value: 'mortgage', label: 'Crédito hipotecario / vivienda', category: 'Crédito hipotecario' },
  { value: 'auto_loan', label: 'Crédito de vehículo', category: 'Crédito de vehículo' },
  { value: 'student_loan', label: 'Crédito educativo', category: 'Crédito educativo' },
  { value: 'retail_credit', label: 'Crédito comercial / almacén', category: 'Crédito comercial' },
  { value: 'installment_purchase', label: 'Compra a cuotas / crédito digital', category: 'Compra a cuotas' },
  { value: 'overdue_bill', label: 'Factura u obligación vencida', category: 'Obligación vencida' },
  { value: 'family_loan', label: 'Deuda con familiar / amigo', category: 'Familiar o amigo' },
  { value: 'other', label: 'Otra obligación', category: 'Otra obligación' }
];

const RATE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'EA', label: 'Efectiva Anual (E.A.)' },
  { value: 'MV', label: 'Mes Vencido (M.V.)' },
  { value: 'NAMV', label: 'Nominal Anual Mes Vencido (N.A.M.V.)' },
  { value: 'INDEXED', label: 'Indexada / variable' },
  { value: 'IBR_MARGIN', label: 'IBR + margen' },
  { value: 'IPC_MARGIN', label: 'IPC + margen' },
  { value: 'UVR_MARGIN', label: 'UVR + margen' },
  { value: 'NONE', label: 'Sin intereses' }
];

type FormState = Omit<Debt, 'id'>;

const emptyForm = (): FormState => ({
  name: '',
  entity: '',
  type: 'credit_card',
  categoryLabel: 'Tarjeta de crédito',
  originalAmount: 0,
  currentBalance: 0,
  interestRate: 0,
  rateType: 'EA',
  monthlyPayment: 0,
  minimumPayment: 0,
  dueDateDay: 15,
  nextDueDate: getTodayIsoDate(),
  disbursementDate: undefined,
  termRemainingMonths: 0,
  accountNumber: '',
  status: 'al_dia',
  notes: '',
  color: '#008FA6',
  details: {}
});

export const AddDebtModal: React.FC = () => {
  const {
    isAddDebtOpen,
    setIsAddDebtOpen,
    editingDebtId,
    setEditingDebtId,
    debts,
    handleAddDebt
  } = useApp();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAddDebtOpen) return;
    const debt = debts.find((item) => item.id === editingDebtId);
    setForm(debt ? { ...debt, details: debt.details || {} } : emptyForm());
    setError(null);
  }, [isAddDebtOpen, editingDebtId, debts]);

  if (!isAddDebtOpen) return null;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setDetail = (key: string, value: string | number | boolean) => {
    setForm((current) => ({ ...current, details: { ...current.details, [key]: value } }));
  };

  const close = () => {
    setIsAddDebtOpen(false);
    setEditingDebtId(null);
  };

  const handleTypeChange = (type: DebtType) => {
    const selected = TYPE_OPTIONS.find((option) => option.value === type)!;
    setForm((current) => ({ ...current, type, categoryLabel: selected.category, details: {} }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (form.currentBalance > form.originalAmount) {
      setError('El saldo actual no puede superar el valor original.');
      return;
    }
    try {
      setSaving(true);
      await handleAddDebt({
        ...form,
        interestRate: form.rateType === 'NONE' ? 0 : form.interestRate,
        dueDateDay: form.nextDueDate ? new Date(`${form.nextDueDate}T12:00:00`).getDate() : form.dueDateDay
      });
      close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar la deuda.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="debt-modal-title">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400"><Landmark className="w-5 h-5" /></div>
            <div>
              <h3 id="debt-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">{editingDebtId ? 'Editar deuda' : 'Registrar nueva deuda'}</h3>
              <p className="text-xs text-slate-500">Los datos financieros se guardarán en Ceroa.</p>
            </div>
          </div>
          <button onClick={close} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs font-semibold">Nombre de la deuda *
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} required className={inputClass} placeholder="Ej. Tarjeta principal" />
            </label>
            <label className="space-y-1 text-xs font-semibold">Entidad o acreedor *
              <input value={form.entity} onChange={(e) => setField('entity', e.target.value)} required className={inputClass} placeholder="Ej. Banco, comercio o persona" />
            </label>
          </div>

          <label className="space-y-1 text-xs font-semibold block">Tipo de deuda *
            <select value={form.type} onChange={(e) => handleTypeChange(e.target.value as DebtType)} className={inputClass}>
              {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs font-semibold">Valor original *
              <input type="number" min="0.01" step="0.01" value={form.originalAmount} onChange={(e) => setField('originalAmount', Number(e.target.value))} required className={inputClass} />
            </label>
            <label className="space-y-1 text-xs font-semibold">Saldo actual *
              <input type="number" min="0" step="0.01" value={form.currentBalance} onChange={(e) => setField('currentBalance', Number(e.target.value))} required className={inputClass} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs font-semibold">Tipo de tasa *
              <select value={form.rateType} onChange={(e) => setField('rateType', e.target.value as RateType)} className={inputClass}>
                {RATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">Valor de tasa (%)
              <input type="number" min="0" step="0.0001" disabled={form.rateType === 'NONE'} value={form.rateType === 'NONE' ? 0 : form.interestRate} onChange={(e) => setField('interestRate', Number(e.target.value))} className={`${inputClass} disabled:opacity-60`} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="space-y-1 text-xs font-semibold">Cuota o pago acordado
              <input type="number" min="0" step="0.01" value={form.monthlyPayment} onChange={(e) => setField('monthlyPayment', Number(e.target.value))} className={inputClass} />
            </label>
            {form.type === 'credit_card' && <label className="space-y-1 text-xs font-semibold">Pago mínimo
              <input type="number" min="0" step="0.01" value={form.minimumPayment} onChange={(e) => setField('minimumPayment', Number(e.target.value))} className={inputClass} />
            </label>}
            <label className="space-y-1 text-xs font-semibold">Próximo vencimiento
              <input type="date" value={form.nextDueDate || ''} onChange={(e) => setField('nextDueDate', e.target.value)} className={inputClass} />
            </label>
          </div>

          {form.type === 'credit_card' && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="space-y-1 text-xs font-semibold">Cupo total<input type="number" min="0" value={Number(form.details?.creditLimit || 0)} onChange={(e) => setDetail('creditLimit', Number(e.target.value))} className={inputClass} /></label>
            <label className="space-y-1 text-xs font-semibold">Cupo disponible<input type="number" min="0" value={Number(form.details?.availableCredit || 0)} onChange={(e) => setDetail('availableCredit', Number(e.target.value))} className={inputClass} /></label>
            <label className="space-y-1 text-xs font-semibold">Día de corte<input type="number" min="1" max="31" value={Number(form.details?.statementDay || 1)} onChange={(e) => setDetail('statementDay', Number(e.target.value))} className={inputClass} /></label>
          </div>}

          {form.type === 'mortgage' && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="space-y-1 text-xs font-semibold">Modalidad<select value={String(form.details?.modality || 'PESOS')} onChange={(e) => setDetail('modality', e.target.value)} className={inputClass}><option value="PESOS">Pesos</option><option value="UVR">UVR</option></select></label>
            <label className="space-y-1 text-xs font-semibold">Índice de referencia<input value={String(form.details?.referenceIndex || '')} onChange={(e) => setDetail('referenceIndex', e.target.value)} className={inputClass} /></label>
            <label className="space-y-1 text-xs font-semibold">Seguros mensuales<input type="number" min="0" value={Number(form.details?.insurance || 0)} onChange={(e) => setDetail('insurance', Number(e.target.value))} className={inputClass} /></label>
          </div>}

          {(form.type === 'personal_loan' || form.type === 'retail_credit' || form.type === 'installment_purchase') && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs font-semibold">Total de cuotas<input type="number" min="1" value={Number(form.details?.totalInstallments || 1)} onChange={(e) => setDetail('totalInstallments', Number(e.target.value))} className={inputClass} /></label>
            <label className="space-y-1 text-xs font-semibold">Cuotas pendientes<input type="number" min="0" value={form.termRemainingMonths || 0} onChange={(e) => setField('termRemainingMonths', Number(e.target.value))} className={inputClass} /></label>
          </div>}

          {form.type === 'auto_loan' && <label className="space-y-1 text-xs font-semibold block">Pago final extraordinario (opcional)<input type="number" min="0" value={Number(form.details?.balloonPayment || 0)} onChange={(e) => setDetail('balloonPayment', Number(e.target.value))} className={inputClass} /></label>}

          {form.type === 'student_loan' && <label className="space-y-1 text-xs font-semibold block">Etapa<select value={String(form.details?.stage || 'STUDY')} onChange={(e) => setDetail('stage', e.target.value)} className={inputClass}><option value="STUDY">Estudio</option><option value="GRACE">Gracia</option><option value="AMORTIZATION">Amortización</option></select></label>}

          {form.type === 'overdue_bill' && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="space-y-1 text-xs font-semibold">Vencimiento original<input type="date" value={String(form.details?.originalDueDate || '')} onChange={(e) => setDetail('originalDueDate', e.target.value)} className={inputClass} /></label>
            <label className="space-y-1 text-xs font-semibold">Gastos de cobranza<input type="number" min="0" value={Number(form.details?.collectionCosts || 0)} onChange={(e) => setDetail('collectionCosts', Number(e.target.value))} className={inputClass} /></label>
            <label className="space-y-1 text-xs font-semibold">Periodicidad del acuerdo<input value={String(form.details?.periodicity || '')} onChange={(e) => setDetail('periodicity', e.target.value)} className={inputClass} /></label>
          </div>}

          {form.type === 'family_loan' && <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.rateType !== 'NONE'} onChange={(e) => setField('rateType', e.target.checked ? 'EA' : 'NONE')} /> Tiene intereses</label>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1 text-xs font-semibold">Fecha de desembolso / inicio<input type="date" max={getTodayIsoDate()} value={form.disbursementDate || ''} onChange={(e) => setField('disbursementDate', e.target.value || undefined)} className={inputClass} /></label>
            <label className="space-y-1 text-xs font-semibold">Referencia de cuenta<input value={form.accountNumber || ''} onChange={(e) => setField('accountNumber', e.target.value)} className={inputClass} /></label>
          </div>

          <label className="space-y-1 text-xs font-semibold block">Notas<textarea value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} rows={2} className={inputClass} /></label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={close} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 rounded-xl shadow-xs">{saving ? 'Guardando...' : editingDebtId ? 'Guardar cambios' : 'Guardar deuda'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
