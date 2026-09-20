import { NotificationItem } from '../types';
import { apiRequest } from './api';

export interface NotificationListResult {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface MarkReadResult {
  id: string;
  read: boolean;
  readAt?: string | null;
  unreadCount: number;
}

export interface ExternalReminderPayload {
  debtId?: string;
  title: string;
  message: string;
  eventDate: string;
  channel?: string;
  eventKey?: string;
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
    return (res.notifications || []).map(formatNotification);
  },

  async getNotificationCenter(): Promise<NotificationListResult> {
    const res = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
    return {
      notifications: (res.notifications || []).map(formatNotification),
      unreadCount: Number(res.unreadCount || 0)
    };
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiRequest<{ unreadCount: number }>('/notifications/unread-count');
    return Number(res.unreadCount || 0);
  },

  async markAsRead(id: string): Promise<NotificationItem[]> {
    await apiRequest<MarkReadResult>(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
    return this.getNotifications();
  },

  async markAsReadSingle(id: string): Promise<MarkReadResult> {
    return apiRequest<MarkReadResult>(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },

  async markAllAsRead(): Promise<NotificationItem[]> {
    const list = await this.getNotifications();
    const unread = list.filter((n) => !n.read);
    await Promise.all(unread.map((n) => this.markAsReadSingle(n.id).catch(() => null)));
    return this.getNotifications();
  },

  async syncExternalReminder(payload: ExternalReminderPayload): Promise<NotificationItem> {
    const res = await apiRequest<NotificationItem>('/notifications/external-reminder', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return formatNotification(res);
  }
};

function formatNotification(n: any): NotificationItem {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type || 'reminder',
    read: Boolean(n.read),
    date: n.eventDate || n.createdAt || '',
    eventDate: n.eventDate,
    relatedDebtId: n.relatedDebtId || null,
    relatedDebtName: n.relatedDebtName || null,
    readAt: n.readAt || null,
    channel: n.channel || 'IN_APP',
    eventKey: n.eventKey || null,
    planRestricted: Boolean(n.planRestricted),
    createdAt: n.createdAt,
    timeAgo: n.timeAgo || formatTimeAgo(n.createdAt || n.eventDate)
  };
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diffHours = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Hace un momento';
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}
