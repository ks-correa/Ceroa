import { NotificationItem } from '../types';
import { LocalStorageManager } from './storage';

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    LocalStorageManager.initInterfaceData();
    await new Promise((res) => setTimeout(res, 30));
    return LocalStorageManager.get<NotificationItem[]>('notifications', []);
  },

  async markAsRead(id: string): Promise<NotificationItem[]> {
    const list = await this.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    LocalStorageManager.set('notifications', updated);
    return updated;
  },

  async markAllAsRead(): Promise<NotificationItem[]> {
    const list = await this.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    LocalStorageManager.set('notifications', updated);
    return updated;
  }
};
