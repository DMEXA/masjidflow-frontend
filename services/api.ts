import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/src/constants';
import { toast } from 'sonner';
import {
  clearRefreshTokenAvailable,
  clearTwoFactorPending,
  hasRefreshToken,
  isTwoFactorFlowActive,
  markRefreshTokenAvailable,
} from '@/services/auth-session';
import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';

const MAX_REFRESH_RETRIES = 2;
const REFRESH_RETRY_DELAY_MS = 400;
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

function handleUnauthorized(): void {
  if (typeof window === 'undefined') return;
  clearAccessToken();
  clearRefreshTokenAvailable();
  clearTwoFactorPending();
  window.location.href = '/login';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

const api = axios.create({
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
    console.log('REFRESH_ATTEMPT', attempt);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const newToken = res.data.accessToken as string;

      setAccessToken(newToken);
      markRefreshTokenAvailable();
      console.log('REFRESH_SUCCESS');
      return newToken;
    } catch (refreshError) {
      console.log('REFRESH_FAILED');

      if (attempt > MAX_REFRESH_RETRIES) {
        throw refreshError;
      }

      await sleep(REFRESH_RETRY_DELAY_MS);
    }
  }

  throw new Error('Refresh attempts exhausted');
}

function maybePreemptiveRefresh(token: string, requestPath: string): void {
  if (isRefreshing) return;
  if (!hasRefreshToken() || isTwoFactorFlowActive()) return;
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
      const requiresAuth = Boolean(requestPath) && !isPublicEndpoint(requestPath);

      if (!token && requiresAuth && (!hasRefreshToken() || isTwoFactorFlowActive())) {
        return Promise.reject(new Error('No active session'));
      }

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

// Response interceptor to handle 401 with silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestPath = resolveRequestPath(originalRequest?.url || '');

    if (originalRequest?._retry) {
      return Promise.reject(error);
    }

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isPublicEndpoint(requestPath) &&
      !requestPath.startsWith('/auth/refresh') &&
      !isTwoFactorFlowActive();

    if (shouldAttemptRefresh) {
      if (!hasRefreshToken()) {
        handleUnauthorized();
        return Promise.reject(error);
      }

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
        // Refresh failed — clear auth and redirect
        onRefreshFailed(refreshError);
        handleUnauthorized();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // For auth endpoints or non-401, just reject
    if (
      error.response?.status === 401 &&
      (requestPath.startsWith('/auth/me') || requestPath.startsWith('/auth/refresh'))
    ) {
      // Don't redirect on /auth/me checks
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !isPublicEndpoint(requestPath)) {
      handleUnauthorized();
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
