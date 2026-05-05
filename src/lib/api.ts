import { getAccessToken } from './auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

function normalizeErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== 'object') {
    return `Request failed with status ${status}`;
  }

  const payload = data as { message?: unknown; error?: unknown };

  if (Array.isArray(payload.message)) {
    return payload.message.join('. ');
  }
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  return `Request failed with status ${status}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = false } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(normalizeErrorMessage(data, res.status));
  }

  return (await res.json()) as T;
}

export { API_URL };
