import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Mosque } from '@/types';
import type { UserRole } from '@/src/constants';
import { ROLE_PERMISSIONS } from '@/src/constants';
import { authService } from '@/services/auth.service';
import { isTwoFactorFlowActive } from '@/services/auth-session';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

let bootstrapPromise: Promise<void> | null = null;

interface AuthState {
  user: User | null;
  mosque: Mosque | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  
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
        let token = authService.getToken();

        if (!token) {
          if (isTwoFactorFlowActive()) {
            authService.removeToken();
            set({
              user: null,
              mosque: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: 'unauthenticated',
            });
            return;
          }

          try {
            const refreshed = await authService.refreshToken();
            token = refreshed.accessToken;
          } catch {
            authService.removeToken();
            set({
              user: null,
              mosque: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              authStatus: 'unauthenticated',
            });
            return;
          }
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
          });
        } catch {
          authService.removeToken();
          set({
            user: null,
            mosque: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            authStatus: 'unauthenticated',
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
