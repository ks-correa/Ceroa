import React, { useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  RefreshCw, 
  CheckCheck,
  ArrowLeft,
  Send,
  Calendar,
  Lock,
  BellOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import { formatDate } from '../../utils/formatters';

export const NotificationsDrawer: React.FC = () => {
  const { 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    notifications, 
    unreadNotificationsCount,
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    navigateToDebtDetail,
    setCurrentScreen
  } = useApp();


  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotificationsOpen) {
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotificationsOpen, setIsNotificationsOpen]);

  if (!isNotificationsOpen) return null;

  const handleOpenNotification = async (notif: NotificationItem) => {
    
    // Marcar como leída de forma autoritativa en backend
    if (!notif.read) {
      try {
        await handleMarkNotificationRead(notif.id);
      } catch {
        return;
      }
    }

    // Si tiene deuda relacionada, navegar al detalle (HU-050 CA-02)
    if (notif.relatedDebtId) {
      setIsNotificationsOpen(false);
      navigateToDebtDetail(notif.relatedDebtId);
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'due_date_reminder':
      case 'reminder':
        return (
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true">
            <Calendar className="w-5 h-5" />
          </div>
        );
      case 'milestone':
        return (
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-cyan-400 flex-shrink-0" aria-hidden="true">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'system':
        return (
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-500 flex-shrink-0" aria-hidden="true">
            <RefreshCw className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-cyan-400 flex-shrink-0" aria-hidden="true">
            <CreditCard className="w-5 h-5" />
          </div>
        );
    }
  };

  const unreadList = notifications.filter((n) => !n.read);
  const readList = notifications.filter((n) => n.read);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Centro de notificaciones"
      data-testid="notifications-drawer"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsNotificationsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsNotificationsOpen(false)}
                aria-label="Cerrar centro de notificaciones"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Notificaciones</span>
                  {unreadNotificationsCount > 0 && (
                    <span 
                      className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white"
                      aria-label={`${unreadNotificationsCount} no leídas`}
                    >
                      {unreadNotificationsCount}
                    </span>
                  )}
                </h2>
              </div>
            </div>

            {unreadList.length > 0 && (
              <button
                onClick={handleMarkAllNotificationsRead}
                className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>

          {/* Body content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Empty state (HU-049 CA-05) */}
            {notifications.length === 0 && (
              <div 
                className="py-16 text-center space-y-3"
                data-testid="notifications-empty"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <BellOff className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Sin notificaciones
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  No tienes eventos financieros ni avisos de vencimientos pendientes en este momento.
                </p>
              </div>
            )}

            {/* Nuevas / No leídas */}
            {unreadList.length > 0 && (
              <div className="space-y-3" data-testid="notifications-unread-section">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Nuevas ({unreadList.length})</span>
                </div>
                {unreadList.map((notif) => (
                  <div
                    key={notif.id}
                    data-testid={`notification-item-${notif.id}`}
                    onClick={() => handleOpenNotification(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenNotification(notif);
                      }
                    }}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border-l-4 border-rose-500 border-t border-r border-b border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-start gap-3.5 group"
                  >
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-700 dark:group-hover:text-cyan-400 transition-colors">
                          {notif.title}
                        </h4>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          No leída
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px]">
                        {/* Fecha */}
                        <span className="text-slate-400">
                          {formatDate(notif.eventDate || notif.date)}
                        </span>

                        {/* Deuda relacionada (HU-049 CA-03 & HU-050 CA-02) */}
                        {notif.relatedDebtName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-cyan-300 border border-teal-200/60 dark:border-teal-800">
                            <CreditCard className="w-3 h-3" aria-hidden="true" />
                            <span>{notif.relatedDebtName}</span>
                          </span>
                        )}

                        {/* Canal Telegram (HU-051 CA-03) */}
                        {notif.channel === 'TELEGRAM' && (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                            data-testid="channel-telegram-badge"
                          >
                            <Send className="w-3 h-3 text-sky-500" aria-hidden="true" />
                            <span>Telegram</span>
                          </span>
                        )}

                        {/* Restricción de Plan (HU-051 CA-04) */}
                        {notif.planRestricted && (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            data-testid="plan-restricted-badge"
                          >
                            <Lock className="w-3 h-3" aria-hidden="true" />
                            <span>Plan Cero: Exclusivo Plus</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Anteriores / Leídas */}
            {readList.length > 0 && (
              <div className="space-y-3" data-testid="notifications-read-section">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Anteriores ({readList.length})</span>
                </div>
                {readList.map((notif) => (
                  <div
                    key={notif.id}
                    data-testid={`notification-item-${notif.id}`}
                    onClick={() => handleOpenNotification(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenNotification(notif);
                      }
                    }}
                    className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-start gap-3.5 cursor-pointer group"
                  >
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-700 dark:group-hover:text-cyan-400 transition-colors">
                          {notif.title}
                        </h4>
                        <span className="text-[11px] font-medium text-slate-400 flex-shrink-0">
                          Leída
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px]">
                        <span className="text-slate-400">
                          {formatDate(notif.eventDate || notif.date)}
                        </span>

                        {notif.relatedDebtName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <CreditCard className="w-3 h-3" aria-hidden="true" />
                            <span>{notif.relatedDebtName}</span>
                          </span>
                        )}

                        {notif.channel === 'TELEGRAM' && (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                            data-testid="channel-telegram-badge"
                          >
                            <Send className="w-3 h-3 text-sky-500" aria-hidden="true" />
                            <span>Telegram</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Ceroa Alertas
            </span>
            <button
              onClick={() => {
                setIsNotificationsOpen(false);
                setCurrentScreen('debts');
              }}
              className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:text-teal-800 transition-colors cursor-pointer"
            >
              Ver mis obligaciones &rarr;
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
