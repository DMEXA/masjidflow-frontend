'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/src/store/auth.store';
import { AuthLoadingScreen } from '@/components/common/auth-loading-screen';

const navItems = [
  { href: '/platform/subscriptions', label: 'Subscriptions' },
  { href: '/platform/mosques', label: 'Mosques' },
  { href: '/platform/trash', label: 'Trash' },
  { href: '/platform/payments', label: 'Payments' },
  { href: '/platform/settings', label: 'Settings' },
  { href: '/platform/audit-logs', label: 'Audit Logs' },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, authStatus, checkAuth, user } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (authStatus === 'authenticated' && isAuthenticated && !user?.isPlatformAdmin) {
      router.replace(user?.role === 'muqtadi' ? '/app/dashboard' : '/dashboard');
    }
  }, [authStatus, isAuthenticated, user?.isPlatformAdmin, user?.role, router]);

  if (authStatus === 'loading' || isLoading) {
    return <AuthLoadingScreen message="Loading platform..." />;
  }

  if (!isAuthenticated || !user?.isPlatformAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/80">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center gap-2 ds-section">
          <div className="mr-4 text-sm font-semibold text-foreground">Platform Console</div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-2xl ds-section">{children}</main>
    </div>
  );
}
