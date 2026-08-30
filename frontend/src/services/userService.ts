import { FinancialProfile, UserPreferences, UserProfile } from '../types';
import { LocalStorageManager } from './storage';
import { apiRequest } from './api';
import { normalizeUser } from './authService';
import { DEFAULT_PREFERENCES } from '../constants/defaults';

interface BackendUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  documentId?: string;
  plan: 'CERO' | 'PLUS';
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
        phone: profile.phone ?? current.phone ?? '',
        documentId: profile.documentId ?? current.documentId ?? ''
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
    return LocalStorageManager.get<UserPreferences>('preferences', DEFAULT_PREFERENCES);
  },

  async updatePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    LocalStorageManager.set('preferences', updated);
    return updated;
  },

  async upgradePlan(plan: 'cero' | 'plus', billingCycle: 'monthly' | 'annual'): Promise<UserProfile> {
    void plan;
    void billingCycle;
    throw new Error('Las suscripciones todavía no están conectadas a un proveedor de pagos. No se realizó ningún cargo.');
  }
};
