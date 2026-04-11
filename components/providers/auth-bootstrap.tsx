'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/auth.store';

export function AuthBootstrap() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return null;
}
