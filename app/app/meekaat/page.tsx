'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PrayerTimes } from '@/components/mosque/PrayerTimes';
import { AuthLoadingScreen } from '@/components/common/auth-loading-screen';
import { useAuthStore } from '@/src/store/auth.store';

export default function SharedMeekaatPage() {
  const router = useRouter();
  const { checkAuth, authStatus, isLoading, isAuthenticated, user, mosque } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (authStatus === 'authenticated' && isAuthenticated && !user?.mosqueId) {
      router.replace('/login');
    }
  }, [authStatus, isAuthenticated, user?.mosqueId, router]);

  if (authStatus === 'loading' || isLoading) {
    return <AuthLoadingScreen message="Loading prayer times..." />;
  }

  if (!isAuthenticated || !user?.mosqueId) {
    return null;
  }

  return <PrayerTimes mosqueId={user.mosqueId} mosqueName={mosque?.name} />;
}
