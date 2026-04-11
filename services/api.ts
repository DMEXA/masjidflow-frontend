import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/src/constants';
import { toast } from 'sonner';
import {
  isLogoutInProgress,
  clearRefreshTokenAvailable,
  clearTwoFactorPending,
  isTwoFactorFlowActive,
  markRefreshTokenAvailable,
} from '@/services/auth-session';
import { useAuthStore } from '@/src/store/auth.store';
import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';

const MAX_REFRESH_RETRIES = 1;
const PREEMPTIVE_REFRESH_WINDOW_MS = 60 * 1000;

const PUBLIC_ENDPOINT_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/accept-invite',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/verify-email-otp',
  '/auth/verify-totp',
  '/auth/2fa/setup',
  '/auth/2fa/verify',
  '/auth/2fa/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
  '/auth/logout',
  '/muqtadis/register',
  '/donations/public',
  '/funds/public',
  '/health',
];

function isPublicEndpoint(url: string): boolean {
  return PUBLIC_ENDPOINT_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function resolveRequestPath(url: string): string {
  if (!url) return '';

  try {
    const parsedUrl = new URL(url, API_BASE_URL);
    return parsedUrl.pathname.replace(/^\/api\/v1/, '');
  } catch {
    return url;
  }
}

let isLoggingOut = false;

async function performControlledLogout(): Promise<void> {
  if (isLoggingOut) {
    return;
  }

  isLoggingOut = true;
  try {
    const { useAuthStore } = await import('@/src/store/auth.store');
    await useAuthStore.getState().logout();
  } catch (error) {
    clearAccessToken();
    clearRefreshTokenAvailable();
    clearTwoFactorPending();
  } finally {
    isLoggingOut = false;
  }
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    if (typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Send cookies (refresh_token) with requests
});

// Track whether a refresh is already in progress
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];
let refreshFailureSubscribers: ((error: unknown) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
  refreshFailureSubscribers = [];
}

function onRefreshFailed(error: unknown) {
  refreshFailureSubscribers.forEach((cb) => cb(error));
  refreshSubscribers = [];
  refreshFailureSubscribers = [];
}

function addRefreshSubscriber(
  onSuccess: (token: string) => void,
  onFailure: (error: unknown) => void,
) {
  refreshSubscribers.push(onSuccess);
  refreshFailureSubscribers.push(onFailure);
}

async function refreshAccessTokenWithRetry(): Promise<string> {
  let attempt = 0;

  while (attempt <= MAX_REFRESH_RETRIES) {
    attempt += 1;

    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const newToken = res.data.accessToken as string;

      setAccessToken(newToken);
      markRefreshTokenAvailable();
      return newToken;
    } catch (refreshError) {
      if (attempt > MAX_REFRESH_RETRIES) {
        throw refreshError;
      }
    }
  }

  throw new Error('Refresh attempts exhausted');
}

function maybePreemptiveRefresh(token: string, requestPath: string): void {
  if (isRefreshing) return;
  if (isTwoFactorFlowActive()) return;
  if (!requestPath || isPublicEndpoint(requestPath) || requestPath.startsWith('/auth/refresh')) return;

  const expiryMs = decodeJwtExpiryMs(token);
  if (!expiryMs) return;

  const needsRefreshSoon = expiryMs - Date.now() <= PREEMPTIVE_REFRESH_WINDOW_MS;
  if (!needsRefreshSoon) return;

  isRefreshing = true;

  void (async () => {
    try {
      const newToken = await refreshAccessTokenWithRetry();
      onRefreshed(newToken);
    } catch (refreshError) {
      onRefreshFailed(refreshError);
    } finally {
      isRefreshing = false;
    }
  })();
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = getAccessToken();
      const requestPath = resolveRequestPath(typeof config.url === 'string' ? config.url : '');

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        maybePreemptiveRefresh(token, requestPath);
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

function getApiErrorMessage(error: AxiosError): string | null {
  const message = (error.response?.data as { message?: string | string[] } | undefined)?.message;
  if (Array.isArray(message)) return message[0] ?? null;
  if (typeof message === 'string' && message.trim().length > 0) return message;
  return null;
}

function handleUnverifiedHousehold(): void {
  if (typeof window === 'undefined') return;
  window.location.href = '/household-pending';
}

function shouldForceLogoutAfterRefreshFailure(error: unknown): boolean {
  if (isLogoutInProgress()) {
    return false;
  }

  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 401 || status === 403;
}

// Response interceptor to handle 401 with silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestPath = resolveRequestPath(originalRequest?.url || '');

    if (error.response?.status === 401 && requestPath.startsWith('/auth/refresh')) {
      if (isLogoutInProgress()) {
        return Promise.reject(error);
      }

      const state = useAuthStore.getState();
      if (state.authStatus === 'authenticated' && state.isAuthenticated) {
        await performControlledLogout();
      } else {
        console.warn('Refresh failed during bootstrap, ignoring logout');
      }
      return Promise.reject(error);
    }

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isPublicEndpoint(requestPath) &&
      !requestPath.startsWith('/auth/refresh') &&
      !isTwoFactorFlowActive();

    if (shouldAttemptRefresh) {
      if (isRefreshing) {
        // Wait for the ongoing refresh, then retry with new token
        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api(originalRequest));
          }, () => {
            reject(error);
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessTokenWithRetry();
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        onRefreshed(newToken);
        return api(originalRequest);
      } catch (refreshError) {
        // Only force logout for explicit auth failures, not transient network issues.
        onRefreshFailed(refreshError);
        if (shouldForceLogoutAfterRefreshFailure(refreshError)) {
          await performControlledLogout();
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    const message = getApiErrorMessage(error);
    if (error.response?.status === 403 && message === 'Household not verified yet') {
      handleUnverifiedHousehold();
      return Promise.reject(error);
    }

    if (
      typeof window !== 'undefined' &&
      !requestPath.startsWith('/auth/refresh') &&
      !requestPath.startsWith('/auth/me')
    ) {
      toast.error(message || 'Something went wrong. Please try again.');
    }

    return Promise.reject(error);
  }
);

export default api;
