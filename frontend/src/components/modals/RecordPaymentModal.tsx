import React, { useEffect, useState } from 'react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';
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
    formatCurrency,
    openAddDebtModal
  } = useApp();

  const [selectedDebtId, setSelectedDebtId] = useState('');
  const [amount, setAmount] = useState<number | string>('');
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
      const initialAmount = suggestedPaymentAmount ?? debt?.monthlyPayment ?? debt?.minimumPayment ?? (debt?.currentBalance ? Math.min(debt.currentBalance, 100000) : 0);
      setAmount(initialAmount > 0 ? initialAmount : (debt?.currentBalance ?? ''));
      setPaymentType('monthly_fee');
      setDate(getTodayIsoDate());
      setNotes('');
    }
    setError(null);
  }, [isRecordPaymentOpen, editingPayment, targetPaymentDebtId, suggestedPaymentAmount, debts]);

  if (!isRecordPaymentOpen) return null;

  const isEditing = Boolean(editingPayment);
  const currentDebt = debts.find((debt) => debt.id === selectedDebtId);

  // En edición, el saldo disponible para saldar la deuda es su saldo actual más el pago que se está editando
  const restoredBalance = currentDebt
    ? (isEditing && editingPayment ? currentDebt.currentBalance + editingPayment.amount : currentDebt.currentBalance)
    : 0;

  const handleDebtChange = (newDebtId: string) => {
    setSelectedDebtId(newDebtId);
    if (paymentType === 'full') {
      const debt = debts.find((d) => d.id === newDebtId);
      if (debt) setAmount(debt.currentBalance);
    }
  };

  const selectType = (type: PaymentType) => {
    setPaymentType(type);
    if (type === 'full') {
      setAmount(restoredBalance);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!selectedDebtId) {
      setError('Debes seleccionar una obligación.');
      return;
    }

    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('El valor del pago debe ser mayor que cero.');
      return;
    }

    const today = getTodayIsoDate();
    if (date > today) {
      setError('La fecha del pago no puede ser futura.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        debtId: selectedDebtId,
        amount: numericAmount,
        type: paymentType,
        notes: notes.trim() || undefined,
        date
      };

      if (editingPayment) {
        await handleUpdatePayment(editingPayment.id, payload);
      } else {
        await handleRecordPayment(payload);
      }
      setIsRecordPaymentOpen(false);
    } catch (cause) {
      // CA-08: Si backend rechaza el pago, no mostrarlo como registrado y conservar los campos para corrección/reintento
      setError(cause instanceof Error ? cause.message : 'No fue posible guardar el pago.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="payment-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Editar pago o abono' : 'Registrar pago o abono'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? 'El ajuste financiero se recalcula tras la confirmación del servidor.'
                  : 'El saldo cambia solo después de la confirmación del servicio.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRecordPaymentOpen(false)}
            disabled={saving}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {debts.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No tienes obligaciones registradas para asociar un pago.
            </p>
            <button
              onClick={() => {
                setIsRecordPaymentOpen(false);
                openAddDebtModal();
              }}
              className="px-4 py-2 bg-[var(--ceroa-primary)] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Registrar una deuda
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-4 space-y-4">
            
            {/* Error Message with role="alert" */}
            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Deuda Relacionada (Inmutable en edición - HU-043 CA-02) */}
            <label className="space-y-1 text-xs font-semibold block text-slate-700 dark:text-slate-300">
              <span>Deuda relacionada *</span>
              <select
                id="payment-debt-select"
                value={selectedDebtId}
                onChange={(e) => handleDebtChange(e.target.value)}
                disabled={isEditing || saving}
                required
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {debts.map((debt) => (
                  <option key={debt.id} value={debt.id}>
                    {debt.name} - Saldo: {formatCurrency(debt.currentBalance)}
                  </option>
                ))}
              </select>
              {isEditing && (
                <span className="text-[10px] text-slate-400 block font-normal">
                  La obligación asociada no puede modificarse durante la edición de un pago confirmado.
                </span>
              )}
            </label>

            {/* 4 Tipos Exactos de Pago (HU-042 CA-02) */}
            <fieldset disabled={saving}>
              <legend className="text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                Tipo de pago *
              </legend>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de pago">
                {PAYMENT_TYPES.map((type) => {
                  const isSelected = paymentType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => selectType(type.value)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--ceroa-primary)] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Valor del Pago (HU-042 CA-03 & CA-05) */}
            <label className="space-y-1 text-xs font-semibold block text-slate-700 dark:text-slate-300">
              <span>Valor del pago *</span>
              <input
                id="payment-amount-input"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={saving}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 text-base font-extrabold text-[var(--ceroa-primary)] dark:text-cyan-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-60"
              />
              {currentDebt && (
                <div className="flex justify-between items-center text-[11px] font-normal text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>Saldo actual de la deuda:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(currentDebt.currentBalance)}
                  </span>
                </div>
              )}
            </label>

            {/* Fecha del Pago (HU-042 CA-04) */}
            <label className="space-y-1 text-xs font-semibold block text-slate-700 dark:text-slate-300">
              <span>Fecha del pago *</span>
              <input
                id="payment-date-input"
                type="date"
                max={getTodayIsoDate()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={saving}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-60"
              />
            </label>

            {/* Nota (Opcional - RQF-024) */}
            <label className="space-y-1 text-xs font-semibold block text-slate-700 dark:text-slate-300">
              <span>Nota (opcional)</span>
              <textarea
                id="payment-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
                disabled={saving}
                placeholder="Ej. Abono prima de junio, pago por transferencia bancaria..."
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-60"
              />
            </label>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(false)}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                id="submit-payment-btn"
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] disabled:opacity-60 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {saving
                  ? isEditing
                    ? 'Guardando cambios...'
                    : 'Confirmando pago...'
                  : isEditing
                    ? 'Guardar cambios'
                    : 'Confirmar pago'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
