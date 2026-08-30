import { NotificationItem, UserPreferences } from '../types';

const INITIAL_PREFERENCES: UserPreferences = {
  darkMode: false,
  language: 'es',
  currency: 'COP',
  emailNotifications: true,
  dueAlertsDaysBefore: 3
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export class LocalStorageManager {
  private static getKey(key: string): string {
    return `ceroa_${key}`;
  }

  static get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.warn('No fue posible guardar una preferencia local.', error);
    }
  }

  static initInterfaceData(): void {
    if (!localStorage.getItem(this.getKey('preferences'))) this.set('preferences', INITIAL_PREFERENCES);
    if (!localStorage.getItem(this.getKey('notifications'))) this.set('notifications', INITIAL_NOTIFICATIONS);
  }
}
