import { UserProfile } from '../types';
import { apiRequest } from './api';

interface BackendUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  birthDate?: string;
  plan: 'CERO' | 'PLUS';
  billingCycle: 'monthly' | 'annual';
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  birthDate?: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
}

export const normalizeUser = (user: BackendUser): UserProfile => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  plan: user.plan.toLowerCase() as UserProfile['plan'],
  billingCycle: user.billingCycle
});

export const authService = {
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
    await apiRequest<void>('/auth/logout', { method: 'POST' });
  }
};
