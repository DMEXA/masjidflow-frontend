'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/auth.store';
import type { UserRole } from '@/src/constants';

export function useAuth(options?: { requireAuth?: boolean; requiredRole?: UserRole; redirectTo?: string }) {
  const { requireAuth = false, requiredRole, redirectTo = '/login' } = options || {};
  const router = useRouter();
  const { user, mosque, isAuthenticated, isLoading, checkAuth, hasPermission, isRole, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isLoading) return;

    if (requireAuth && !isAuthenticated) {
      router.push(redirectTo);
      return;
    }

    if (requiredRole && user && user.role !== requiredRole) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, requireAuth, requiredRole, user, router, redirectTo]);

  return {
    user,
    mosque,
    isAuthenticated,
    isLoading,
    hasPermission,
    isRole,
    logout,
  };
}
