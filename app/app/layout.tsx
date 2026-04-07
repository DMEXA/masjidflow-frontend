'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, CreditCard, FileText, Home, Loader2, UserRound } from 'lucide-react';
import { useAuthStore } from '@/src/store/auth.store';
import { Button } from '@/components/ui/button';
import { useNotificationsQuery } from '@/hooks/useNotificationsQuery';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { AuthLoadingScreen } from '@/components/common/auth-loading-screen';

const verifiedNavItems = [
  { href: '/app/dashboard', label: 'Dashboard', icon: Home },
  { href: '/app/my-dues', label: 'Dues', icon: FileText },
  { href: '/app/pay', label: 'Pay', icon: CreditCard },
  { href: '/app/announcements', label: 'Announcements', icon: Bell },
  { href: '/app/profile', label: 'Profile', icon: UserRound },
];

const unverifiedNavItems = [
  { href: '/app/meekaat', label: 'Prayer Timings', icon: Home },
  { href: '/app/announcements', label: 'Announcements', icon: Bell },
  { href: '/donate', label: 'Donate', icon: CreditCard },
];

const unverifiedAllowedRoutes = ['/app/announcements', '/app/meekaat'];

export default function MuqtadiAppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth, isAuthenticated, isLoading, authStatus, user, mosque, logout } = useAuthStore();
  const profileQuery = useProfileQuery();
  const notificationsQuery = useNotificationsQuery();
  const unreadCount = (notificationsQuery.data ?? []).filter((item) => !item.isRead).length;
  const isVerified = profileQuery.data?.isVerified ?? user?.isVerified ?? false;
  const navItems = isVerified ? verifiedNavItems : unverifiedNavItems;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/login');
      return;
    }

    if (authStatus === 'authenticated' && isAuthenticated && user?.role && user.role !== 'muqtadi') {
      const adminRoles = ['super_admin', 'admin', 'treasurer'];
      if (adminRoles.includes(user.role)) {
        router.replace('/dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [authStatus, isAuthenticated, user, router]);

  useEffect(() => {
    if (authStatus === 'loading' || isLoading || !isAuthenticated || user?.role !== 'muqtadi') return;
    if (profileQuery.isLoading) return;

    if (!isVerified && !unverifiedAllowedRoutes.includes(pathname)) {
      router.replace('/household-pending');
    }
  }, [
    authStatus,
    isLoading,
    isAuthenticated,
    user,
    profileQuery.isLoading,
    isVerified,
    pathname,
    router,
  ]);

  if (authStatus === 'loading' || isLoading) {
    return <AuthLoadingScreen message="Loading your account..." />;
  }

  if (isAuthenticated && user?.role === 'muqtadi' && profileQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'muqtadi') {
    return null;
  }

  if (!isVerified && !unverifiedAllowedRoutes.includes(pathname)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between ds-section">
          <div>
            <p className="text-sm text-muted-foreground">Household Portal</p>
            <p className="font-semibold text-foreground">{mosque?.name || 'Masjid'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" className="relative" aria-label="Open notifications">
              <Link href="/app/notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                router.replace('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </div>
        <div className="mx-auto hidden max-w-3xl gap-1 ds-px pb-3 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-3xl ds-section ds-stack pb-24 md:pb-5">{children}</main>

      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center px-1 py-2 text-[11px] ${isActive ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
                href={item.href}
              >
                <Icon className="h-4 w-4" />
                <span className="mt-1 line-clamp-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
