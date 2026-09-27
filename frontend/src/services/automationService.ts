import { apiRequest } from './api';

export interface AutomationCredential {
  id: string;
  name: string;
  allowWrites: boolean;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export const automationService = {
  list: () => apiRequest<AutomationCredential[]>('/integrations/tokens'),
  create: (name: string, allowWrites: boolean, days: number) =>
    apiRequest<{ credential: AutomationCredential; token: string }>('/integrations/tokens', {
      method: 'POST', body: JSON.stringify({ name, allowWrites, days })
    }),
  revoke: (id: string) => apiRequest<void>(`/integrations/tokens/${id}`, { method: 'DELETE' })
};
