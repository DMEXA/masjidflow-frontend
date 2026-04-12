'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/auth.store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MuqtadiResolveSkeleton } from '@/components/common/loading-skeletons';
import { AppShellLoader } from '@/components/common/app-shell-loader';

type ResolveState = 'booting' | 'resolving' | 'success' | 'failed';

export default function MuqtadiDonateEntryPage() {
  const router = useRouter();
  const { mosque, isLoading, authStatus, hasTriedBootstrap } = useAuthStore();
  const [resolveState, setResolveState] = useState<ResolveState>('booting');

  useEffect(() => {
    let cancelled = false;
    let failTimer: ReturnType<typeof setTimeout> | null = null;

    const resolveAndRedirect = async () => {
      if (!hasTriedBootstrap || isLoading || authStatus === 'loading') {
        if (!cancelled) {
          setResolveState('booting');
        }
        return;
      }

      if (authStatus !== 'authenticated') {
        if (!cancelled) {
          setResolveState('failed');
        }
        return;
      }

      if (!cancelled) {
        if (mosque?.slug) {
          setResolveState('success');
          router.replace(`/app/donate/${mosque.slug}`);
          return;
        }

        setResolveState('resolving');
        failTimer = setTimeout(() => {
          if (!cancelled && !mosque?.slug) {
            setResolveState('failed');
          }
        }, 1500);
      }
    };

    void resolveAndRedirect();

    return () => {
      cancelled = true;
      if (failTimer) {
        clearTimeout(failTimer);
      }
    };
  }, [authStatus, hasTriedBootstrap, isLoading, mosque?.slug, router]);

  if (resolveState === 'booting') {
    return <AppShellLoader title="Opening Donate" message="Verifying your session and mosque access..." />;
  }

  if (resolveState === 'failed') {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-xl items-center justify-center px-4">
        <Alert>
          <AlertTitle>Unable to open Donate page</AlertTitle>
          <AlertDescription>
            Your mosque donate link could not be resolved right now. Please try again, or return to dashboard.
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/app/donate">Retry</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <MuqtadiResolveSkeleton />
    </div>
  );
}
