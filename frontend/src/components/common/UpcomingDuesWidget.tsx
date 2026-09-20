import React from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  AlertOctagon, 
  CheckCircle2, 
  CheckCheck, 
  CalendarClock, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { UpcomingDueItem, ReminderMilestone } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface UpcomingDuesWidgetProps {
  variant: 'dashboard' | 'list' | 'detail';
  dues?: UpcomingDueItem[];
  singleDue?: UpcomingDueItem | null;
  isLoading?: boolean;
  onSelectDebt?: (debtId: string) => void;
  title?: string;
  showStatusBadge?: boolean;
}

export const UpcomingDuesWidget: React.FC<UpcomingDuesWidgetProps> = ({
  variant,
  dues = [],
  singleDue,
  isLoading = false,
  onSelectDebt,
  title = 'Próximos Vencimientos',
  showStatusBadge = true
}) => {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'vence_hoy':
      case 'DUE_TODAY':
        return {
          label: 'Vence hoy',
          icon: <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
          classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      case 'en_mora':
      case 'OVERDUE':
        return {
          label: 'En mora',
          icon: <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
          classes: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200 border-red-300 dark:border-red-800'
        };
      case 'pagada':
      case 'PAID':
        return {
          label: 'Pagada',
          icon: <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
          classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
        };
      case 'al_dia':
      case 'CURRENT':
      default:
        return {
          label: 'Al día',
          icon: <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
          classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
    }
  };

  const getMilestoneDisplay = (milestone: ReminderMilestone) => {
    switch (milestone) {
      case 'SEVEN_DAYS':
        return {
          label: 'Hito: 7 días antes',
          icon: <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
          classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      case 'THREE_DAYS':
        return {
          label: 'Hito: 3 días antes',
          icon: <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
          classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'DUE_TODAY':
        return {
          label: 'Hito: Vence hoy',
          icon: <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />,
          classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800'
        };
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
      </div>
    );
  }

  // Variant: Detail View (Single Debt)
  if (variant === 'detail') {
    if (!singleDue) {
      return (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
          <Calendar className="w-6 h-6 text-slate-400 mx-auto mb-1.5" aria-hidden="true" />
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Sin fecha de vencimiento fija
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Esta obligación no registra vencimiento periódico pendiente.
          </p>
        </div>
      );
    }

    const statusInfo = getStatusDisplay(singleDue.status);
    const milestoneInfo = getMilestoneDisplay(singleDue.reminderMilestone);

    return (
      <div 
        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
        data-testid="due-detail-widget"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Próximo Vencimiento
          </span>
          {showStatusBadge && (
            <span 
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.classes}`}
              aria-label={`Estado: ${statusInfo.label}`}
            >
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatDate(singleDue.dueDate)}
          </div>
          <div className="text-sm font-bold text-teal-700 dark:text-cyan-400">
            {formatCurrency(singleDue.amount)}
          </div>
        </div>

        {milestoneInfo && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span 
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${milestoneInfo.classes}`}
              data-testid="due-milestone-badge"
              aria-label={`Hito de vencimiento: ${milestoneInfo.label}`}
            >
              {milestoneInfo.icon}
              <span>{milestoneInfo.label}</span>
            </span>
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {singleDue.daysUntilDue === 0
              ? 'El pago vence hoy'
              : singleDue.daysUntilDue > 0
              ? `Faltan ${singleDue.daysUntilDue} días para la fecha límite`
              : `Venció hace ${Math.abs(singleDue.daysUntilDue)} días`}
          </span>
        </div>
      </div>
    );
  }

  // Variant: Dashboard (Compact or Highlights) & List (Full cards)
  const items = dues;

  if (items.length === 0) {
    return (
      <div 
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center shadow-xs"
        data-testid="upcoming-dues-empty"
      >
        <ShieldCheck className="w-10 h-10 text-teal-600/60 dark:text-cyan-400/60 mx-auto mb-2" aria-hidden="true" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Sin vencimientos próximos
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          No tienes obligaciones pendientes por vencer en los próximos días o están al día.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="space-y-3"
      data-testid="upcoming-dues-widget"
    >
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-cyan-400" aria-hidden="true" />
            <span>{title}</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {items.length} {items.length === 1 ? 'obligación' : 'obligaciones'}
          </span>
        </div>
      )}

      <div className={variant === 'dashboard' ? 'space-y-2.5' : 'grid grid-cols-1 md:grid-cols-2 gap-3.5'}>
        {items.map((due) => {
          const statusInfo = getStatusDisplay(due.status);
          const milestoneInfo = getMilestoneDisplay(due.reminderMilestone);

          return (
            <div
              key={due.debtId}
              data-testid={`due-item-${due.debtId}`}
              onClick={() => onSelectDebt?.(due.debtId)}
              role={onSelectDebt ? 'button' : undefined}
              tabIndex={onSelectDebt ? 0 : undefined}
              onKeyDown={(e) => {
                if (onSelectDebt && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectDebt(due.debtId);
                }
              }}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-all ${
                onSelectDebt 
                  ? 'hover:border-teal-500/50 dark:hover:border-cyan-500/50 hover:shadow-sm cursor-pointer' 
                  : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {due.debtName}
                    </h4>
                    <span className="text-xs text-slate-400">
                      ({due.entity})
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>{formatDate(due.dueDate)}</span>
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {due.daysUntilDue === 0 ? 'Hoy' : `${due.daysUntilDue} días`}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-extrabold text-teal-700 dark:text-cyan-400">
                    {formatCurrency(due.amount)}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Cuota / Exigible
                  </span>
                </div>
              </div>

              {/* Status and Milestones row */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Canonical status */}
                  <span 
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.classes}`}
                    aria-label={`Estado: ${statusInfo.label}`}
                  >
                    {statusInfo.icon}
                    <span>{statusInfo.label}</span>
                  </span>

                  {/* 7/3/0 Milestone distinction */}
                  {milestoneInfo && (
                    <span 
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${milestoneInfo.classes}`}
                      data-testid="due-milestone-badge"
                      aria-label={`Hito: ${milestoneInfo.label}`}
                    >
                      {milestoneInfo.icon}
                      <span>{milestoneInfo.label}</span>
                    </span>
                  )}
                </div>

                {onSelectDebt && (
                  <span className="text-xs font-semibold text-teal-700 dark:text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Detalle</span>
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
