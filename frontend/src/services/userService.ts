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
  birthDate?: string;
  plan: 'CERO' | 'PLUS';
  initialSetupComplete?: boolean;
}

type FinancialProfileUpdate = Pick<
  FinancialProfile,
  'monthlyIncome' | 'fixedExpenses' | 'availableMoney' | 'totalDeclaredDebts' | 'activeStrategy'
>;

const normalizeFinancialProfile = (profile: any): FinancialProfile => ({
  ...profile,
  activeStrategy: (profile.activeStrategy?.toLowerCase() || 'snowball') as StrategyType,
  monthlyIncome: Number(profile.monthlyIncome || 0),
  fixedExpenses: Number(profile.fixedExpenses || profile.essentialExpenses || 0),
  availableMoney: Number(profile.availableMoney || profile.availableForDebts || 0),
  paymentCapacity: Number(profile.paymentCapacity || profile.availableForDebts || 0)
});

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
        phone: profile.phone ?? current.phone ?? '',
        documentId: profile.documentId ?? current.documentId ?? '',
        birthDate: profile.birthDate ?? current.birthDate ?? ''
      })
    }));
  },

  async requestEmailChange(newEmail: string): Promise<{ requestId: string; message: string }> {
    return apiRequest<{ requestId: string; message: string }>('/users/me/email/change', {
      method: 'POST',
      body: JSON.stringify({ newEmail })
    });
  },

  async verifyEmailChange(requestId: string, code: string): Promise<UserProfile> {
    return normalizeUser(await apiRequest<BackendUser>('/users/me/email/verify', {
      method: 'POST',
      body: JSON.stringify({ requestId, code })
    }));
  },

  async getFinancialProfile(): Promise<FinancialProfile> {
    return normalizeFinancialProfile(await apiRequest<FinancialProfile>('/financial-profile'));
  },

  async updateFinancialProfile(financial: FinancialProfileUpdate): Promise<FinancialProfile> {
    const updated = await apiRequest<FinancialProfile>('/financial-profile', {
      method: 'PUT',
      body: JSON.stringify({
        monthlyIncome: financial.monthlyIncome,
        fixedExpenses: financial.fixedExpenses,
        availableMoney: financial.availableMoney,
        totalDeclaredDebts: financial.totalDeclaredDebts,
        activeStrategy: (financial.activeStrategy || 'snowball').toUpperCase()
      })
    });
    return normalizeFinancialProfile(updated);
  },

  async updateStrategy(strategy: StrategyType): Promise<FinancialProfile> {
    const updated = await apiRequest<FinancialProfile>(`/financial-profile/strategy?strategy=${strategy.toUpperCase()}`, {
      method: 'PUT'
    });
    return normalizeFinancialProfile(updated);
  },

  async completeInitialSetup(): Promise<UserProfile> {
    return normalizeUser(await apiRequest<BackendUser>('/financial-profile/complete', {
      method: 'POST'
    }));
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

