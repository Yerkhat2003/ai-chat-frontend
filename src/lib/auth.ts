const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
export type UserRole = 'USER' | 'ADMIN' | 'SUPERADMIN';
export type AuthContext = {
  role: UserRole | null;
  roles: string[];
  permissions: string[];
};

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function clearRefreshToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuthTokens(): void {
  clearAccessToken();
  clearRefreshToken();
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = window.atob(normalized);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): UserRole | null {
  return getAuthContext().role;
}

export function getAuthContext(): AuthContext {
  const token = getAccessToken();
  if (!token) {
    return { role: null, roles: [], permissions: [] };
  }

  const payload = decodeJwtPayload(token);
  const roleValue = payload?.role;
  const role =
    roleValue === 'SUPERADMIN' || roleValue === 'ADMIN' || roleValue === 'USER'
      ? roleValue
      : null;

  const roles = Array.isArray(payload?.roles)
    ? payload.roles.filter((value): value is string => typeof value === 'string')
    : [];
  const permissions = Array.isArray(payload?.permissions)
    ? payload.permissions.filter(
        (value): value is string => typeof value === 'string',
      )
    : [];

  return {
    role,
    roles,
    permissions,
  };
}
