import React from 'react';
import { 
  X, 
  CreditCard, 
  CheckCircle2, 
  RefreshCw, 
  Lightbulb, 
  CheckCheck,
  ArrowLeft
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';

export const NotificationsDrawer: React.FC = () => {
  const { 
    isNotificationsOpen, 
    setIsNotificationsOpen, 
    notifications, 
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    setCurrentScreen
  } = useApp();

  if (!isNotificationsOpen) return null;

  const newNotifications = notifications.filter((n) => !n.read);
  const olderNotifications = notifications.filter((n) => n.read);

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'reminder':
        return (
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500">
            <CreditCard className="w-5 h-5" />
          </div>
        );
      case 'milestone':
        return (
          <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-cyan-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'system':
        return (
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-500">
            <RefreshCw className="w-5 h-5" />
          </div>
        );
      case 'tip':
      default:
        return (
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
            <Lightbulb className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
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
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Notificaciones
              </h2>
            </div>

            {newNotifications.length > 0 && (
              <button
                onClick={handleMarkAllNotificationsRead}
                className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Nuevas */}
            {newNotifications.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Nuevas
                </div>
                {newNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkNotificationRead(notif.id)}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-l-4 border-rose-500 border-t border-r border-b border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-start gap-3.5 relative"
                  >
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          {notif.timeAgo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Anteriores */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Anteriores
              </div>
              {olderNotifications.length > 0 ? (
                olderNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-all flex items-start gap-3.5"
                  >
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 flex-shrink-0">
                          {notif.timeAgo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No hay notificaciones anteriores.</p>
              )}
            </div>

          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
            <button
              onClick={() => {
                setIsNotificationsOpen(false);
                setCurrentScreen('calendar');
              }}
              className="text-xs font-semibold text-teal-700 dark:text-cyan-400 hover:text-teal-800 transition-colors"
            >
              Ver calendario de pagos &rarr;
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
