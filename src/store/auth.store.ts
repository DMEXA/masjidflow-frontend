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

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

let bootstrapPromise: Promise<void> | null = null;

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
            const refreshed = await authService.refreshToken();
            token = refreshed.accessToken;
          } catch (error) {
            const status =
              typeof error === 'object' &&
              error !== null &&
              'response' in error &&
              typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;

            if (status === 401 || status === 403) {
              // Bootstrap refresh auth failures should not trigger logout chain.
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

            console.warn('Profile missing or refresh unavailable transiently, skipping logout');
            set({
              token: get().token,
              user: get().user,
              mosque: get().mosque,
              isAuthenticated: true,
              isLoading: false,
              authStatus: 'authenticated',
              hasTriedBootstrap: true,
            });
            return;
          }

          try {
            const { user, mosque } = await authService.getCurrentUser();
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
            console.error('getCurrentUser ERROR:', error);

            // DO NOT logout immediately
            set({
              isLoading: false,
              authStatus: 'authenticated',
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
      partialize: () => ({}),
    }
  )
);
