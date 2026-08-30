import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaymentType } from '../../types';
import { getTodayIsoDate } from '../../utils/date';

const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'minimum', label: 'Pago mínimo' },
  { value: 'monthly_fee', label: 'Pago de cuota' },
  { value: 'extra_principal', label: 'Abono adicional' },
  { value: 'full', label: 'Pago total' }
];

export const RecordPaymentModal: React.FC = () => {
  const {
    isRecordPaymentOpen,
    setIsRecordPaymentOpen,
    targetPaymentDebtId,
    editingPayment,
    suggestedPaymentAmount,
    debts,
    handleRecordPayment,
    handleUpdatePayment,
    formatCurrency
  } = useApp();
  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<PaymentType>('monthly_fee');
  const [date, setDate] = useState(getTodayIsoDate);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isRecordPaymentOpen) return;
    if (editingPayment) {
      setSelectedDebtId(editingPayment.debtId);
      setAmount(editingPayment.amount);
      setPaymentType(editingPayment.type);
      setDate(editingPayment.date);
      setNotes(editingPayment.notes || '');
    } else {
      const debtId = targetPaymentDebtId || debts[0]?.id || '';
      const debt = debts.find((item) => item.id === debtId);
      setSelectedDebtId(debtId);
      setAmount(suggestedPaymentAmount ?? debt?.monthlyPayment ?? debt?.minimumPayment ?? 0);
      setPaymentType('monthly_fee');
      setDate(getTodayIsoDate());
      setNotes('');
    }
    setError(null);
  }, [isRecordPaymentOpen, editingPayment, targetPaymentDebtId, suggestedPaymentAmount, debts]);

  if (!isRecordPaymentOpen) return null;
  const currentDebt = debts.find((debt) => debt.id === selectedDebtId);

  const selectType = (type: PaymentType) => {
    setPaymentType(type);
    if (type === 'full' && currentDebt) setAmount(currentDebt.currentBalance);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!selectedDebtId || amount <= 0) {
      setError('Selecciona una deuda e ingresa un valor mayor que cero.');
      return;
    }
    try {
      setSaving(true);
      const payload = { debtId: selectedDebtId, amount, type: paymentType, notes, date };
      if (editingPayment) await handleUpdatePayment(editingPayment.id, payload);
      else await handleRecordPayment(payload);
      setIsRecordPaymentOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar el pago.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400"><CheckCircle2 className="w-5 h-5" /></div>
            <div>
              <h3 id="payment-modal-title" className="text-base font-bold text-slate-900 dark:text-white">{editingPayment ? 'Editar pago o abono' : 'Registrar pago o abono'}</h3>
              <p className="text-xs text-slate-500">El saldo cambia solo después de la confirmación del servicio.</p>
            </div>
          </div>
          <button onClick={() => setIsRecordPaymentOpen(false)} aria-label="Cerrar" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">{error}</div>}

          <label className="space-y-1 text-xs font-semibold block">Deuda
            <select value={selectedDebtId} onChange={(e) => setSelectedDebtId(e.target.value)} className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none">
              {debts.map((debt) => <option key={debt.id} value={debt.id}>{debt.name} - {formatCurrency(debt.currentBalance)}</option>)}
            </select>
          </label>

          <fieldset>
            <legend className="text-xs font-semibold mb-1">Tipo de pago</legend>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_TYPES.map((type) => <button key={type.value} type="button" onClick={() => selectType(type.value)} className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${paymentType === type.value ? 'bg-[var(--ceroa-primary)] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{type.label}</button>)}
            </div>
          </fieldset>

          <label className="space-y-1 text-xs font-semibold block">Valor del pago *
            <input type="number" min="0.01" step="0.01" max={editingPayment && currentDebt ? currentDebt.currentBalance + editingPayment.amount : currentDebt?.currentBalance} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required className="w-full px-3.5 py-2.5 text-base font-extrabold text-[var(--ceroa-primary)] dark:text-cyan-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
            {currentDebt && <span className="text-[11px] font-normal text-slate-500">Saldo actual: {formatCurrency(currentDebt.currentBalance)}</span>}
          </label>

          <label className="space-y-1 text-xs font-semibold block">Fecha del pago *
            <input type="date" max={getTodayIsoDate()} value={date} onChange={(e) => setDate(e.target.value)} required className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
          </label>

          <label className="space-y-1 text-xs font-semibold block">Nota (opcional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none" />
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsRecordPaymentOpen(false)} className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-bold text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 rounded-xl shadow-xs">{saving ? 'Guardando...' : editingPayment ? 'Guardar cambios' : 'Confirmar pago'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
