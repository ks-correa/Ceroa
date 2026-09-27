export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_PATHS_WITH_EXPECTED_UNAUTHORIZED = new Set(['/auth/login', '/auth/register', '/auth/me']);
export const SESSION_EXPIRED_EVENT = 'ceroa:session-expired';
let csrfTokenRequest: Promise<string> | null = null;
let sessionExpirationNotified = false;
let sessionGeneration = 0;
export const invalidateSessionRequests = () => { sessionGeneration++; };

const readCookie = (name: string): string | null => {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
};

interface ApiErrorPayload {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'API_ERROR',
    public readonly fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const getCsrfToken = (): Promise<string> => {
  const cookieToken = readCookie('XSRF-TOKEN');
  if (cookieToken) return Promise.resolve(cookieToken);

  if (!csrfTokenRequest) {
    csrfTokenRequest = fetch(`${API_URL}/auth/csrf`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new ApiError('No fue posible iniciar una solicitud segura.', response.status);
        const payload = await response.json() as { token: string };
        return payload.token;
      })
      .catch((cause) => {
        throw cause;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }
  return csrfTokenRequest;
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const generation = sessionGeneration;
  let response: Response;
  try {
    const method = (init?.method || 'GET').toUpperCase();
    const headers = new Headers(init?.headers);
    if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (!SAFE_HTTP_METHODS.has(method)) headers.set('X-XSRF-TOKEN', await getCsrfToken());

    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers
    });
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw new ApiError(
      'No fue posible conectar con el servicio de Ceroa. Verifica que el backend esté en ejecución.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (!path.startsWith('/auth/') && generation !== sessionGeneration) throw new ApiError('La sesión ha finalizado.', 401);
  if (!response.ok) {
    if (response.status === 403) csrfTokenRequest = null;
    if (
      response.status === 401
      && !AUTH_PATHS_WITH_EXPECTED_UNAUTHORIZED.has(path) && !path.startsWith('/auth/external/')
      && !sessionExpirationNotified
    ) {
      sessionExpirationNotified = true;
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
    throw new ApiError(
      payload.message || 'El servicio no pudo completar la solicitud.',
      response.status,
      payload.code,
      payload.fieldErrors
    );
  }

  if (path === '/auth/login' || path === '/auth/register' || path === '/auth/me') {
    sessionExpirationNotified = false;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
