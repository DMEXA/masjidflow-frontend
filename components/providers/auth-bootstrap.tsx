'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/src/store/auth.store';
import { API_BASE_URL } from '@/src/constants';

export function AuthBootstrap() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    console.log('API BASE URL:', API_BASE_URL);
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return null;
}
