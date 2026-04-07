'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Clock3, HandCoins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/src/store/auth.store';
import { useProfileQuery } from '@/hooks/useProfileQuery';

export default function HouseholdPendingPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, isLoading, user } = useAuthStore();
  const profileQuery = useProfileQuery();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isLoading && isAuthenticated && user?.role && user.role !== 'muqtadi') {
      router.replace('/dashboard');
      return;
    }

    if (!profileQuery.isLoading && profileQuery.data?.isVerified) {
      router.replace('/app/dashboard');
    }
  }, [isLoading, isAuthenticated, user, profileQuery.isLoading, profileQuery.data?.isVerified, router]);

  if (isLoading || profileQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-4">
        <div className="h-24 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isAuthenticated && user?.role && user.role !== 'muqtadi') {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Household Pending Approval</CardTitle>
          <CardDescription>
            Your household has not been verified yet. Please contact the admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full" variant="outline">
            <Link href="/app/announcements">
              <Bell className="mr-2 h-4 w-4" />
              View announcements
            </Link>
          </Button>
          <Button asChild className="w-full" variant="outline">
            <Link href="/app/meekaat">
              <Clock3 className="mr-2 h-4 w-4" />
              View prayer timings
            </Link>
          </Button>
          <Button asChild className="w-full">
            <Link href="/donate">
              <HandCoins className="mr-2 h-4 w-4" />
              Donate
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
