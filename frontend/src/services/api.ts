const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '');

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
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      }
    });
  } catch {
    throw new ApiError(
      'No fue posible conectar con el servicio de Ceroa. Verifica que el backend esté en ejecución.',
      0,
      'NETWORK_ERROR'
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
    throw new ApiError(
      payload.message || 'El servicio no pudo completar la solicitud.',
      response.status,
      payload.code,
      payload.fieldErrors
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
