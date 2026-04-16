import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Mosque } from '@/types';
import type { UserRole } from '@/src/constants';
import { ROLE_PERMISSIONS } from '@/src/constants';
import { authService } from '@/services/auth.service';
import {
  clearLogoutInProgress,
  hasRefreshToken,
  isLogoutInProgress,
  isTwoFactorFlowActive,
  markLogoutInProgress,
} from '@/services/auth-session';
import { isTransientServiceError } from '@/src/utils/error';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

let bootstrapPromise: Promise<void> | null = null;

const getHttpStatus = (error: unknown): number | undefined => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
  ) {
    return (error as { response?: { status?: number } }).response?.status;
  }

  return undefined;
};

const isHardAuthFailure = (status: number | undefined): boolean => status === 401 || status === 403;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function retryTransientBootstrap<T>(
  operation: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  const delays = [250, 600];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const canRetry = attempt < maxRetries && isTransientServiceError(error);
      if (!canRetry) {
        throw error;
      }

      await wait(delays[attempt] ?? delays[delays.length - 1]);
    }
  }
}

interface AuthState {
  user: User | null;
  mosque: Mosque | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  hasTriedBootstrap: boolean;
  
  // Actions
  setAuth: (user: User, mosque: Mosque, token: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  
  // Permission helpers
  hasPermission: (permission: keyof typeof ROLE_PERMISSIONS[UserRole]) => boolean;
  isRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      mosque: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      authStatus: 'loading',
      hasTriedBootstrap: false,

      setAuth: (user, mosque, token) => {
        authService.setToken(token);
        set({
          user,
          mosque,
          token,
          isAuthenticated: true,
          isLoading: false,
          authStatus: 'authenticated',
        });
      },

      logout: async () => {
        markLogoutInProgress();
        try {
          await authService.logout();
        } finally {
          authService.removeToken();
          set({
            user: null,
            mosque: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            authStatus: 'unauthenticated',
          });
          clearLogoutInProgress();
        }
      },

      checkAuth: async () => {
        const currentStatus = get().authStatus;
        if (currentStatus !== 'loading') {
          return;
        }

        if (bootstrapPromise) {
          return bootstrapPromise;
        }

        bootstrapPromise = (async () => {
          const snapshot = get();
          const hasSessionSnapshot = Boolean(snapshot.isAuthenticated && snapshot.user && snapshot.mosque);

          if (isLogoutInProgress()) {
            set({
              user: null,
              mosque: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: 'unauthenticated',
              hasTriedBootstrap: true,
            });
            return;
          }

          if (isTwoFactorFlowActive()) {
            authService.removeToken();
            set({
              user: null,
              mosque: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: 'unauthenticated',
              hasTriedBootstrap: true,
            });
            return;
          }

          if (!hasRefreshToken()) {
            set({
              user: null,
              mosque: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: 'unauthenticated',
              hasTriedBootstrap: true,
            });
            return;
          }

          let token: string;
          try {
            const refreshed = await retryTransientBootstrap(() => authService.refreshToken(), 1);
            token = refreshed.accessToken;
          } catch (error) {
            const status = getHttpStatus(error);
            if (!isHardAuthFailure(status) && hasSessionSnapshot) {
              set({
                isAuthenticated: true,
                isLoading: false,
                authStatus: 'authenticated',
                hasTriedBootstrap: true,
              });
              return;
            }

            if (!isHardAuthFailure(status)) {
              console.warn('Refresh failed during bootstrap, falling back to unauthenticated state');
            }

            authService.removeToken();
            set({
              user: null,
              mosque: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: 'unauthenticated',
              hasTriedBootstrap: true,
            });
            return;
          }

          try {
            const { user, mosque } = await retryTransientBootstrap(() => authService.getCurrentUser(), 1);
            set({
              user,
              mosque,
              token,
              isAuthenticated: true,
              isLoading: false,
              authStatus: 'authenticated',
              hasTriedBootstrap: true,
            });
          } catch (error) {
            const status = getHttpStatus(error);
            if (!isHardAuthFailure(status) && hasSessionSnapshot) {
              set({
                isAuthenticated: true,
                isLoading: false,
                authStatus: 'authenticated',
                hasTriedBootstrap: true,
              });
              return;
            }

            authService.removeToken();
            set({
              user: null,
              mosque: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: 'unauthenticated',
              hasTriedBootstrap: true,
            });
          }
        })();

        try {
          await bootstrapPromise;
        } finally {
          bootstrapPromise = null;
        }
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        const permissions = ROLE_PERMISSIONS[user.role];
        return permissions?.[permission] ?? false;
      },

      isRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        mosque: state.mosque,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
