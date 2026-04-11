'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Announcements } from '@/components/mosque/Announcements';
import { AuthLoadingScreen } from '@/components/common/auth-loading-screen';
import { useAuthStore } from '@/src/store/auth.store';

export default function SharedAnnouncementsPage() {
  const router = useRouter();
  const { checkAuth, authStatus, isLoading, isAuthenticated, user } = useAuthStore();

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
    return <AuthLoadingScreen message="Loading announcements..." />;
  }

  if (!isAuthenticated || !user?.mosqueId) {
    return null;
  }

  return <Announcements mosqueId={user.mosqueId} />;
}
