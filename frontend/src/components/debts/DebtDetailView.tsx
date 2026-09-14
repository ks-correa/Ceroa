import React, { useEffect, useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Edit3, 
  PlusCircle, 
  Clock, 
  FileText,
  Trash2,
  AlertTriangle,
  Loader2,
  Calendar,
  CreditCard,
  Landmark,
  Home,
  Car,
  GraduationCap,
  Store,
  ShoppingBag,
  AlertOctagon,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Debt, DebtType, PaymentRecord } from '../../types';
import { debtService } from '../../services/debtService';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  // States for dynamic loading, error and detail data (HU-034 TT-034.3)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debtData, setDebtData] = useState<Debt | null>(null);
  const [debtPayments, setDebtPayments] = useState<PaymentRecord[]>([]);

  const fetchDetailAndPayments = useCallback(async () => {
    if (!selectedDebtId) {
      setLoading(false);
      setDebtData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [debtResult, paymentsResult] = await Promise.all([
        debtService.getDebtById(selectedDebtId),
        debtService.getPayments(selectedDebtId)
      ]);
      setDebtData(debtResult);
      setDebtPayments(paymentsResult);
    } catch (err) {
      console.error('Failed to load debt detail:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar el detalle de la obligación financiera o no tienes permisos para consultarla.'
      );
      setDebtData(null);
      setDebtPayments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDebtId]);

  useEffect(() => {
    fetchDetailAndPayments();
  }, [fetchDetailAndPayments, debts, payments]);

  // Handle ESC key for delete modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        if (paymentToDelete) setPaymentToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm, paymentToDelete]);

  const confirmDelete = async () => {
    if (!debtData) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await handleDeleteDebt(debtData.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al intentar eliminar la deuda. Intenta de nuevo.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const maskValue = (formatted: string) => (hideBalance ? '••••••••' : formatted);

  // 1. Estado de carga (TT-034.3)
  if (loading) {
    return (
      <div 
        role="status" 
        aria-live="polite" 
        className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto space-y-4 my-8"
      >
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Cargando detalle de la obligación...
        </p>
        <span className="sr-only">Cargando información</span>
      </div>
    );
  }

  // 2. Estado de error (CA-05 & CA-06: No mostrar información financiera ante error o falta de autorización)
  if (error || !debtData) {
    return (
      <div 
        role="alert"
        className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 max-w-lg mx-auto space-y-4 my-8 shadow-xs"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Error al consultar la obligación
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {error || 'No se encontró la deuda seleccionada.'}
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => setCurrentScreen('debts')}
            className="px-4 py-2 bg-slate-900 dark:bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Volver a Mis Deudas
          </button>
          {error && (
            <button
              onClick={() => fetchDetailAndPayments()}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  const debt = debtData;
  const paidAmount = Math.max(0, debt.originalAmount - debt.currentBalance);
  const progressPct = debt.originalAmount > 0 
    ? Math.min(100, Math.round((paidAmount / debt.originalAmount) * 100))
    : 0;

  const parsedDueDate = debt.nextDueDate ? new Date(`${debt.nextDueDate.slice(0, 10)}T12:00:00`) : null;
  const relativeDueDate = parsedDueDate && !Number.isNaN(parsedDueDate.getTime())
    ? formatRelativeDueDate(getCalendarDayDifference(parsedDueDate))
    : 'Fecha por confirmar';

  // CA-04: Representar el estado recibido del backend sin permitir edición manual
  const statusLabel = {
    al_dia: 'Al día',
    vence_hoy: 'Vence hoy',
    en_mora: 'En mora',
    pagada: 'Pagada'
  }[debt.status] || 'Al día';

  const statusClass = debt.status === 'en_mora'
    ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800'
    : debt.status === 'vence_hoy'
      ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800'
      : debt.status === 'pagada'
        ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400 border-teal-200/80 dark:border-teal-800'
        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800';

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

  // TT-034.1: Renderizado dinámico de campos específicos para los 10 tipos de obligaciones
  const renderSpecificTypeFields = () => {
    const details = debt.details || {};

    switch (debt.type) {
      case 'credit_card':
        return (
          <>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cupo total</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount || details.creditLimit || 0))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cupo disponible</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                {details.availableCredit !== undefined ? maskValue(formatCurrency(Number(details.availableCredit))) : 'No especificado'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cupo utilizado</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.usedCredit !== undefined ? maskValue(formatCurrency(Number(details.usedCredit))) : 'No especificado'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Pago mínimo actual</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.minimumPayment))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Día de corte</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.statementDay || debt.dueDateDay ? `Día ${details.statementDay || debt.dueDateDay} de cada mes` : (details.statementDate ? formatDate(details.statementDate) : 'No especificado')}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cuota de manejo mensual</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.managementFee ? formatCurrency(Number(details.managementFee)) : 'Sin cuota de manejo'}
              </span>
            </div>
          </>
        );

      case 'personal_loan':
        return (
          <>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor inicial desembolsado</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cuota mensual</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.monthlyPayment))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Plazo / Cuotas restantes</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.termRemainingMonths ? `${debt.termRemainingMonths} meses` : (details.totalInstallments ? `${details.totalInstallments} cuotas` : 'No especificado')}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Fecha de desembolso</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.disbursementDate ? formatDate(debt.disbursementDate) : 'No especificada'}
              </span>
            </div>
          </>
        );

      case 'mortgage':
        return (
          <>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor financiado inicial</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Modalidad de crédito</span>
              <span className="text-sm font-bold text-teal-800 dark:text-cyan-400 mt-0.5 block">
                {String(details.modality || 'PESOS').toUpperCase()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cuota mensual</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.monthlyPayment))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Seguros asociados</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.insuranceAmount ? formatCurrency(Number(details.insuranceAmount)) : 'Sin seguros adicionales'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Plazo restante</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.termRemainingMonths ? `${debt.termRemainingMonths} meses` : 'No especificado'}
              </span>
            </div>
          </>
        );

      case 'auto_loan':
        return (
          <>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor financiado inicial</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cuota mensual vigente</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.monthlyPayment))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Plazo restante</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.termRemainingMonths ? `${debt.termRemainingMonths} meses` : 'No especificado'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor residual / pago final</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.residualValue ? maskValue(formatCurrency(Number(details.residualValue))) : 'Sin cuota residual'}
              </span>
            </div>
          </>
        );

      case 'student_loan':
        return (
          <>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor financiado</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Etapa del crédito</span>
              <span className="text-sm font-bold text-teal-800 dark:text-cyan-400 mt-0.5 block">
                {details.stage === 'ESTUDIO' ? 'Estudio (lectiva)' : (details.stage === 'GRACIA' ? 'Período de gracia' : 'Amortización')}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cobro periódico exigible</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.hasPaymentObligation ? 'Sí (Activo)' : 'No exigible en esta etapa'}
              </span>
            </div>
            {debt.monthlyPayment > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Cuota mensual exigible</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {maskValue(formatCurrency(debt.monthlyPayment))}
                </span>
              </div>
            )}
          </>
        );

      case 'retail_credit':
      case 'installment_purchase':
        return (
          <>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Monto inicial / Valor original</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor de cuota</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.monthlyPayment))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Total de cuotas pactadas</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.totalInstallments ? `${details.totalInstallments} cuotas` : 'No especificado'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Cuotas restantes</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.termRemainingMonths ? `${debt.termRemainingMonths} cuotas` : 'No especificado'}
              </span>
            </div>
            {(details.financialCost || details.fixedFee) && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Costo / Tarifa fija</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {formatCurrency(Number(details.financialCost || details.fixedFee))}
                </span>
              </div>
            )}
          </>
        );

      case 'overdue_bill':
        return (
          <>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Valor original de la factura</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {maskValue(formatCurrency(debt.originalAmount))}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Vencimiento original</span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-400 mt-0.5 block">
                {details.originalDueDate ? formatDate(details.originalDueDate) : (debt.disbursementDate ? formatDate(debt.disbursementDate) : 'No especificado')}
              </span>
            </div>
            {details.collectionCosts && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Gastos de cobranza</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {formatCurrency(Number(details.collectionCosts))}
                </span>
              </div>
            )}
            {details.penaltyRate && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Tasa de mora</span>
                <span className="text-sm font-bold text-rose-700 dark:text-rose-400 mt-0.5 block">
                  {details.penaltyRate}% {details.penaltyRateType || 'M.V.'}
                </span>
              </div>
            )}
            {details.hasPaymentAgreement && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Acuerdo de pago formal</span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  {details.agreedPaymentAmount ? `${formatCurrency(Number(details.agreedPaymentAmount))} (${details.paymentPeriodicity || 'Mensual'})` : 'Pactado'}
                </span>
              </div>
            )}
          </>
        );

      case 'family_loan':
      case 'other':
        return (
          <>
            {debt.originalAmount > 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Valor inicial pactado</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {maskValue(formatCurrency(debt.originalAmount))}
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Valor inicial</span>
                <span className="text-sm font-medium text-slate-500 mt-0.5 block">
                  Sin valor inicial registrado
                </span>
              </div>
            )}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Estado del acuerdo</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {details.hasAgreement ? 'Acuerdo formal establecido' : 'Sin compromiso de fecha/cuota rígido'}
              </span>
            </div>
            {debt.monthlyPayment > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Cuota acordada</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {maskValue(formatCurrency(debt.monthlyPayment))} ({details.periodicity || 'Mensual'})
                </span>
              </div>
            )}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Proyección en Ceroa</span>
              <span className="text-sm font-bold text-teal-800 dark:text-cyan-400 mt-0.5 block">
                {details.hasSufficientProjectionData ? 'Apta para plan de amortización' : 'Saldo informativo (sin calendario)'}
              </span>
            </div>
          </>
        );

      default:
        return null;
    }
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
            id="debt-detail-edit-top-btn"
            onClick={() => openEditDebtModal(debt.id)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-cyan-400 cursor-pointer shadow-2xs"
            title="Editar deuda"
            aria-label="Editar deuda"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            id="debt-detail-delete-top-btn"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shadow-2xs"
            title="Eliminar deuda"
            aria-label="Eliminar deuda"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Header Card: Balance + Radial / Progress Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Balance side */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-300 border border-teal-200/80 dark:border-teal-800">
                {getTypeIcon(debt.type)}
                <span>{debt.categoryLabel || 'Obligación financiera'}</span>
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${statusClass}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                <span>{statusLabel}</span>
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saldo actual pendiente
            </div>

            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {maskValue(formatCurrency(debt.currentBalance))}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="font-bold text-slate-900 dark:text-white">{debt.name}</span>
              <span>•</span>
              <span>{debt.entity || 'Particular / Directo'}</span>
              {debt.originalAmount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-teal-700 dark:text-cyan-400 font-semibold">{progressPct}% pagado</span>
                </>
              )}
            </div>
          </div>

          {/* Radial / Progress Gauge */}
          {debt.originalAmount > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
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
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 max-w-xs text-center sm:text-left">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sin valor inicial fijado</span>
              Esta obligación se contabiliza por su saldo actual en el portafolio general sin monto original de referencia.
            </div>
          )}

        </div>
      </div>

      {/* Row 2: Detalles del Crédito + Próximo Vencimiento / Acciones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Detalles del Crédito (2 cols) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700 dark:text-cyan-400" />
              Detalles de la obligación
            </h3>
            <span className="text-xs text-slate-400">
              Ref: {debt.accountNumber || 'Sin referencia'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Entidad o acreedor</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {debt.entity || 'Particular / Amigo'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 block">Tasa de interés</span>
              <span className="text-sm font-bold text-teal-800 dark:text-cyan-400 mt-0.5 block">
                {debt.rateType === 'NONE' || !debt.interestRate ? 'Sin intereses' : `${debt.interestRate}% ${debt.rateType}`}
              </span>
            </div>

            {/* Campos específicos según el tipo (HU-034 TT-034.1) */}
            {renderSpecificTypeFields()}

            {debt.notes && (
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block">Notas adicionales</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                  {debt.notes}
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Próximo Vencimiento & Botones de Acción (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Próximo Vencimiento
            </span>
            
            <div className="text-2xl sm:text-3xl font-extrabold text-teal-900 dark:text-cyan-300">
              {debt.nextDueDate ? formatDate(debt.nextDueDate) : 'Sin vencimiento fijo'}
            </div>

            {debt.nextDueDate && (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Clock className="w-3.5 h-3.5" />
                <span>{relativeDueDate}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">{debt.type === 'credit_card' ? 'Pago Mínimo:' : 'Cuota / Pago:'}</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {maskValue(formatCurrency(debt.type === 'credit_card' ? debt.minimumPayment : debt.monthlyPayment))}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tasa de Interés:</span>
                <strong className="text-teal-700 dark:text-cyan-400">
                  {debt.rateType === 'NONE' || !debt.interestRate ? '0%' : `${debt.interestRate}% ${debt.rateType}`}
                </strong>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3">
            <button
              id="debt-detail-register-payment-btn"
              onClick={() => openRecordPaymentModal(debt.id)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--ceroa-primary)] hover:bg-[var(--ceroa-primary-hover)] text-white rounded-xl font-bold text-xs shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar pago</span>
            </button>

            <button
              id="debt-detail-edit-btn"
              onClick={() => openEditDebtModal(debt.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar deuda</span>
            </button>

            <button
              id="debt-detail-delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 text-rose-700 dark:text-rose-400 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar deuda definitivamente</span>
            </button>
          </div>
        </div>

      </div>

      {/* Row 3: Historial de Pagos (HU-034 CA-02 & CA-03) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Historial de pagos
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registro de cuotas y abonos asociados a esta obligación
            </p>
          </div>

          <button
            onClick={() => openRecordPaymentModal(debt.id)}
            className="text-xs font-bold text-teal-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                  <th className="pb-3">Tipo de pago</th>
                  <th className="pb-3">Deuda relacionada</th>
                  <th className="pb-3">Nota</th>
                  <th className="pb-3 text-right">Monto</th>
                  <th className="pb-3 text-right">Estado</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {debtPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatDate(pay.date)}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span>{pay.typeLabel}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">
                      {pay.debtName || debt.name}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
                      {pay.notes || '-'}
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">
                      -{maskValue(formatCurrency(pay.amount))}
                    </td>
                    <td className="py-3 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80">
                        Completado
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button 
                        onClick={() => openRecordPaymentModal(debt.id, pay)} 
                        className="p-1.5 text-teal-700 dark:text-cyan-400 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-lg cursor-pointer" 
                        aria-label={`Editar pago del ${pay.date}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => setPaymentToDelete(pay.id)} 
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer" 
                        aria-label={`Eliminar pago del ${pay.date}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* CA-03: Estado vacío comprensible */
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No hay registros de pago asociados a esta obligación
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Cuando registres cuotas o abonos para esta deuda, aparecerán detallados cronológicamente en esta sección.
            </p>
            <button
              onClick={() => openRecordPaymentModal(debt.id)}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-teal-700 dark:text-cyan-400 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar primer pago</span>
            </button>
          </div>
        )}
      </div>

      {/* HU-036: Modal accesible de Confirmación de Eliminación Definitiva */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-debt-modal-title"
          aria-describedby="delete-debt-modal-desc"
        >
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 id="delete-debt-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                ¿Eliminar definitivamente "{debt.name}"?
              </h3>
              <p id="delete-debt-modal-desc" className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Esta acción es <strong>definitiva</strong> y no se puede deshacer. La obligación será eliminada permanentemente de tu cuenta y los cálculos financieros se recalcularán.
              </p>
            </div>

            {/* CA-03 & TT-036.2: Advertencia específica si existen pagos asociados */}
            {debtPayments.length > 0 && (
              <div 
                role="alert" 
                className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-800 dark:text-rose-300 text-xs space-y-1"
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Advertencia sobre historial de pagos</span>
                </div>
                <p className="leading-relaxed">
                  Esta deuda tiene <strong>{debtPayments.length} pago(s) asociados</strong>. Al eliminar la deuda, <strong>también se eliminará definitivamente todo su historial de pagos</strong>.
                </p>
              </div>
            )}

            {deleteError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-100 text-rose-800 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar definitivamente'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar un pago individual */}
      {paymentToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" 
          role="dialog" 
          aria-modal="true"
          aria-labelledby="delete-payment-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 id="delete-payment-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              ¿Eliminar este pago?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El saldo de la deuda se recalculará automáticamente tras la confirmación del backend.
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setPaymentToDelete(null)} 
                className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => { 
                  await handleDeletePayment(paymentToDelete); 
                  setPaymentToDelete(null); 
                }} 
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Eliminar pago
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
