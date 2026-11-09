import { apiRequest } from './api';
import type { PlanAccess } from './planService';

export type Periodicity = 'MONTHLY' | 'YEARLY';
export interface Offer { periodicity: Periodicity; price: number | null; currency: string; automaticRenewal: boolean; available: boolean }
export interface Subscription { status: 'PENDING' | 'ACTIVE' | 'CANCEL_PENDING' | 'CANCEL_SCHEDULED' | 'EXPIRED' | 'REJECTED' | 'CANCELLED' | 'ERROR'; periodicity: Periodicity; price: number; currency: string; automaticRenewal: boolean; startedAt: string | null; nextPaymentAt: string | null; accessUntil: string | null; plusActive: boolean; canCancelRenewal: boolean; checkoutUrl: string | null }
const inflight = new Map<string, Promise<unknown>>();
function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fn().finally(() => { inflight.delete(key); });
  inflight.set(key, p);
  return p;
}

export const subscriptionService = {
  offers: () => dedup('offers', () => apiRequest<Offer[]>('/plus/offers')),
  capabilities: () => dedup('capabilities:PLUS', () => apiRequest<PlanAccess>('/plus/capabilities')),
  ceroCapabilities: () => dedup('capabilities:CERO', () => apiRequest<PlanAccess>('/plus/capabilities?plan=CERO')),
  current: () => dedup('current', () => apiRequest<Subscription | null>('/plus/subscription')),
  checkout: (periodicity: Periodicity) => apiRequest<Subscription>('/plus/checkout', { method: 'POST', body: JSON.stringify({ periodicity }) }),
  cancelRenewal: () => apiRequest<Subscription>('/plus/subscription/cancel-renewal', { method: 'POST' })
};
