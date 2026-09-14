import { apiRequest } from './api';

export const recoveryService = {
  request: (email: string) => apiRequest<{ requestId: string; message: string }>('/auth/recovery/request', {
    method: 'POST', body: JSON.stringify({ email })
  }),
  verify: (requestId: string, code: string) => apiRequest<void>('/auth/recovery/verify', {
    method: 'POST', body: JSON.stringify({ requestId, code })
  }),
  reset: (requestId: string, password: string, confirmPassword: string) => apiRequest<void>('/auth/recovery/reset', {
    method: 'POST', body: JSON.stringify({ requestId, password, confirmPassword })
  })
};
