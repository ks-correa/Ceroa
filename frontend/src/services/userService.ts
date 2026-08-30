import { FinancialProfile, UserPreferences, UserProfile } from '../types';
import { LocalStorageManager } from './storage';
import { apiRequest } from './api';
import { normalizeUser } from './authService';

interface BackendUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  plan: 'CERO' | 'PLUS';
  billingCycle: 'monthly' | 'annual';
}

export const userService = {
  async getUserProfile(): Promise<UserProfile> {
    return normalizeUser(await apiRequest<BackendUser>('/users/me'));
  },

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getUserProfile();
    return normalizeUser(await apiRequest<BackendUser>('/users/me', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: profile.fullName ?? current.fullName,
        email: profile.email ?? current.email,
        phone: profile.phone ?? current.phone ?? ''
      })
    }));
  },

  async getFinancialProfile(): Promise<FinancialProfile> {
    const profile = await apiRequest<FinancialProfile>('/financial-profile');
    return {
      ...profile,
      monthlyIncome: Number(profile.monthlyIncome),
      fixedExpenses: Number(profile.fixedExpenses),
      availableMoney: Number(profile.availableMoney),
      paymentCapacity: Number(profile.paymentCapacity)
    };
  },

  async updateFinancialProfile(financial: Partial<FinancialProfile>): Promise<FinancialProfile> {
    const current = await this.getFinancialProfile();
    return apiRequest<FinancialProfile>('/financial-profile', {
      method: 'PUT',
      body: JSON.stringify({
        monthlyIncome: financial.monthlyIncome ?? current.monthlyIncome,
        fixedExpenses: financial.fixedExpenses ?? current.fixedExpenses,
        availableMoney: financial.availableMoney ?? current.availableMoney,
        totalDeclaredDebts: financial.totalDeclaredDebts ?? current.totalDeclaredDebts,
        activeStrategy: financial.activeStrategy ?? current.activeStrategy
      })
    });
  },

  async getPreferences(): Promise<UserPreferences> {
    LocalStorageManager.initInterfaceData();
    await new Promise((res) => setTimeout(res, 30));
    return LocalStorageManager.get<UserPreferences>('preferences', {
      darkMode: false,
      language: 'es',
      currency: 'COP',
      emailNotifications: true,
      dueAlertsDaysBefore: 3
    });
  },

  async updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    LocalStorageManager.set('preferences', updated);
    return updated;
  },

  async upgradePlan(plan: 'cero' | 'plus', billingCycle: 'monthly' | 'annual'): Promise<UserProfile> {
    return this.updateUserProfile({
      plan,
      billingCycle,
      planRenewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    });
  }
};
