import { UserProfile } from '../types';
import { apiRequest, API_URL } from './api';

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

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  birthDate: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export const normalizeUser = (user: BackendUser): UserProfile => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  birthDate: user.birthDate,
  initialSetupComplete: user.initialSetupComplete === true,
  documentId: user.documentId,
  plan: user.plan.toLowerCase() as UserProfile['plan']
});

export const authService = {
  async startExternal(provider: 'google' | 'microsoft'): Promise<void> {
    const result = await apiRequest<{ url: string }>(`/auth/external/${provider}/start`, { method: 'POST' });
    window.location.assign(new URL(result.url, new URL(API_URL, location.origin).origin).href);
  },
  pendingExternal: () => apiRequest<PendingIdentity>('/auth/external/pending'),
  async completeExternal(payload: RegisterPayload): Promise<UserProfile> {
    const { fullName, email, phone, birthDate, acceptTerms, acceptPrivacy } = payload;
    return normalizeUser(await apiRequest<BackendUser>('/auth/external/complete', {
      method: 'POST', body: JSON.stringify({ fullName, email, phone, birthDate, acceptTerms, acceptPrivacy })
    }));
  },
  cancelExternal: () => apiRequest<void>('/auth/external/cancel', { method: 'POST' }),
  async login(email: string, password: string): Promise<UserProfile> {
    const user = await apiRequest<BackendUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    return normalizeUser(user);
  },

  async register(payload: RegisterPayload): Promise<UserProfile> {
    const user = await apiRequest<BackendUser>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return normalizeUser(user);
  },

  async me(): Promise<UserProfile> {
    return normalizeUser(await apiRequest<BackendUser>('/auth/me'));
  },

  async logout(): Promise<void> {
    await apiRequest<void>('/auth/logout', { method: 'POST', signal: AbortSignal.timeout(15000) });
  }
};

export interface PendingIdentity { provider: string; fullName: string; email: string; }
