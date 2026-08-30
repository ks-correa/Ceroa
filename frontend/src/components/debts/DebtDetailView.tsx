import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Edit3, 
  PlusCircle, 
  Clock, 
  FileText,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRelativeDueDate, getCalendarDayDifference } from '../../utils/date';

export const DebtDetailView: React.FC = () => {
  const { 
    selectedDebtId, 
    debts, 
    payments, 
    formatCurrency, 
    formatNumber,
    formatDate,
    setCurrentScreen, 
    openRecordPaymentModal, 
    openEditDebtModal,
    handleDeleteDebt,
    handleDeletePayment
  } = useApp();

  const [hideBalance, setHideBalance] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const debt = debts.find((d) => d.id === selectedDebtId) || debts[0];

  if (!debt) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto">
        <p className="text-slate-500">No se encontró la deuda seleccionada.</p>
        <button
          onClick={() => setCurrentScreen('debts')}
          className="mt-4 px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold"
        >
          Volver a Mis Deudas
        </button>
      </div>
    );
  }

  // Filter payments for this specific debt
  const debtPayments = payments.filter((p) => p.debtId === debt.id);

  const paidAmount = Math.max(0, debt.originalAmount - debt.currentBalance);
  const progressPct = debt.originalAmount > 0 
    ? Math.min(100, Math.round((paidAmount / debt.originalAmount) * 100))
    : 0;
  const parsedDueDate = new Date(`${debt.nextDueDate.slice(0, 10)}T12:00:00`);
  const relativeDueDate = Number.isNaN(parsedDueDate.getTime())
    ? 'Fecha por confirmar'
    : formatRelativeDueDate(getCalendarDayDifference(parsedDueDate));
  const statusLabel = {
    al_dia: 'Al día',
    vence_hoy: 'Vence hoy',
    en_mora: 'En mora',
    pagada: 'Pagada'
  }[debt.status];
  const statusClass = debt.status === 'en_mora'
    ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800'
    : debt.status === 'vence_hoy'
      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800'
      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800';

  const maskValue = (formatted: string) => {
    return hideBalance ? '••••••••' : formatted;
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12 max-w-5xl mx-auto">
      
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          id="debt-detail-back-btn"
          onClick={() => setCurrentScreen('debts')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-cyan-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Deudas</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideBalance(!hideBalance)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shadow-2xs"
            title="Ocultar saldo"
            aria-label={hideBalance ? 'Mostrar saldo' : 'Ocultar saldo'}
          >
            {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shadow-2xs"
            title="Eliminar deuda"
            aria-label="Eliminar deuda"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header Card: Balance + Radial Progress (Page 6 & 16 of PDF) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Balance side */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-300 border border-teal-200/80 dark:border-teal-800">
                {debt.categoryLabel || 'Otra obligación'}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${statusClass}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {statusLabel}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo actual pendiente
            </div>

            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {maskValue(formatCurrency(debt.currentBalance))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white">{debt.name}</span>
              <span>•</span>
              <span>{debt.entity}</span>
              <span>•</span>
              <span className="text-teal-700 dark:text-cyan-400 font-semibold">{progressPct}% pagado</span>
            </div>
          </div>

          {/* Radial / Progress Gauge */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
            {/* SVG Circular Donut Ring */}
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[var(--ceroa-primary)] dark:text-cyan-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${progressPct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {progressPct}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  Pagado
                </span>
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <div className="text-xs font-semibold text-slate-400">Progreso de amortización</div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                Pagado: <strong className="text-slate-900 dark:text-white">${formatNumber(paidAmount)}</strong>
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                Total: <strong className="text-slate-900 dark:text-white">${formatNumber(debt.originalAmount)}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Row 2: Detalles del Crédito + Próximo Vencimiento / Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Detalles del Crédito (2 cols) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              Detalles del crédito
            </h3>
            <span className="text-xs text-slate-400">
              Cuenta: {debt.accountNumber || '**** 4567'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor original</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount))}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Tasa de interés</span>
              <span className="text-sm font-bold text-teal-800 dark:text-cyan-400 mt-0.5 block">
                {debt.interestRate}% {debt.rateType} (Tasa Fija)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cuota mensual</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.monthlyPayment))}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Plazo restante</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.termRemainingMonths || 120} Meses
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Fecha de Desembolso</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.disbursementDate || '10 Ene 2018'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Entidad emisora</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.entity}
              </span>
            </div>

          </div>
        </div>

        {/* Próximo Vencimiento & Botones de Acción (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Próximo Vencimiento
            </span>
            
            <div className="text-3xl font-extrabold text-teal-900 dark:text-cyan-300">
              {formatDate(debt.nextDueDate)}
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>{relativeDueDate}</span>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Pago Mínimo:</span>
                <strong className="text-slate-800 dark:text-slate-200">{maskValue(formatCurrency(debt.minimumPayment))}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tasa de Interés:</span>
                <strong className="text-teal-700 dark:text-cyan-400">{debt.interestRate}% {debt.rateType}</strong>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3">
            <button
              id="debt-detail-register-payment-btn"
              onClick={() => openEditDebtModal(debt.id)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar pago</span>
            </button>

            <button
              id="debt-detail-edit-btn"
              onClick={() => openRecordPaymentModal(debt.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar deuda</span>
            </button>
            
            <span className="text-[10px] text-slate-400 text-center block">
              Última actualización: Hoy, 09:41 AM
            </span>
          </div>
        </div>

      </div>

      {/* Row 3: Historial de Pagos (Page 6 & 16 of PDF) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Historial de pagos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registro de amortizaciones y cuotas abonadas
            </p>
          </div>

          <button
            onClick={() => openRecordPaymentModal(debt.id)}
            className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            + Registrar nuevo pago
          </button>
        </div>

        {debtPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Fecha</th>
                  <th className="pb-3">Descripción</th>
                  <th className="pb-3 text-right">Monto</th>
                  <th className="pb-3 text-right">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {debtPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white">
                      {formatDate(pay.date)}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span>{pay.typeLabel}</span>
                      </div>
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white text-right">
                      -{maskValue(formatCurrency(pay.amount))}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80">
                        Completado
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button onClick={() => openRecordPaymentModal(debt.id, pay)} className="p-1.5 text-teal-700 dark:text-cyan-400 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-lg" aria-label={`Editar pago del ${pay.date}`}><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setPaymentToDelete(pay.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg" aria-label={`Eliminar pago del ${pay.date}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 italic">
            No hay registros de pago previos para esta obligación.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              ¿Eliminar deuda "{debt.name}"?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Esta acción eliminará definitivamente la deuda y recalculará tu estrategia de pago.
            </p>
            {debtPayments.length > 0 && <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">También se eliminarán {debtPayments.length} pago(s) asociados y su historial.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleDeleteDebt(debt.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">¿Eliminar este pago?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">El saldo de la deuda se recalculará después de que el backend confirme la eliminación.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPaymentToDelete(null)} className="px-3 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
              <button onClick={async () => { await handleDeletePayment(paymentToDelete); setPaymentToDelete(null); }} className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg">Eliminar pago</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
