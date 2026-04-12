'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/auth.store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/common/loading-skeletons';

type ResolveState = 'resolving' | 'ready' | 'failed';

export default function MuqtadiDonateEntryPage() {
  const router = useRouter();
  const { mosque, isLoading, authStatus } = useAuthStore();
  const [resolveState, setResolveState] = useState<ResolveState>('resolving');

  useEffect(() => {
    let cancelled = false;

    const resolveAndRedirect = async () => {
      if (authStatus !== 'authenticated' || isLoading) {
        return;
      }

      if (!cancelled) {
        if (mosque?.slug) {
          setResolveState('ready');
          router.replace(`/app/donate/${mosque.slug}`);
          return;
        }

        setResolveState('failed');
      }
    };

    void resolveAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [authStatus, isLoading, mosque?.slug, router]);

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
      <PageSkeleton rows={1} cardCount={2} />
    </div>
  );
}
