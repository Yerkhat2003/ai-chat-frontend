import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from './auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
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
  const doFetch = async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (auth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();
  if (auth && res.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      res = await doFetch();
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(normalizeErrorMessage(data, res.status));
  }

  return (await res.json()) as T;
}

async function tryRefreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    return false;
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearAuthTokens();
    return false;
  }

  const data = (await res.json()) as RefreshResponse;
  if (!data.accessToken || !data.refreshToken) {
    clearAuthTokens();
    return false;
  }

  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return true;
}

export { API_URL };
