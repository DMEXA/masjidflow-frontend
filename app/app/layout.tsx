'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/auth.store';
import { AppShellLoader } from '@/components/common/app-shell-loader';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { useProfileQuery } from '@/hooks/useProfileQuery';

const PENDING_ALLOWED_PREFIXES = ['/app/announcements', '/app/meekaat', '/app/donate', '/app/profile'];

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { checkAuth, isAuthenticated, isLoading, authStatus, hasTriedBootstrap, user } = useAuthStore();
  const isMuqtadi = user?.role === 'muqtadi';
  const profileQuery = useProfileQuery(Boolean(authStatus === 'authenticated' && isAuthenticated && isMuqtadi));
  const isPendingMuqtadi = isMuqtadi && profileQuery.data?.isVerified === false;
  const isAllowedPendingPath =
    isPendingMuqtadi
      ? PENDING_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
      : true;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus === 'unauthenticated' && hasTriedBootstrap) {
      router.replace('/login');
      return;
    }

    if (authStatus === 'authenticated' && isAuthenticated && !user?.mosqueId) {
      router.replace('/login');
      return;
    }

    if (isPendingMuqtadi && !isAllowedPendingPath) {
      router.replace('/household-pending');
    }
  }, [authStatus, hasTriedBootstrap, isAuthenticated, user?.mosqueId, isPendingMuqtadi, isAllowedPendingPath, router]);

  if (!hasTriedBootstrap || authStatus === 'loading' || isLoading) {
    return <AppShellLoader title="Restoring your session" message="Checking auth, role, and mosque context..." />;
  }

  if (authStatus === 'authenticated' && (!user || !user.mosqueId)) {
    return <AppShellLoader title="Hydrating account" message="Fetching your profile and access context..." />;
  }

  if (isMuqtadi && profileQuery.isLoading) {
    return <AppShellLoader title="Loading Muqtadi profile" message="Checking verification and household state..." />;
  }

  if (isPendingMuqtadi && !isAllowedPendingPath) {
    return <AppShellLoader title="Redirecting" message="Sending you to household approval view..." />;
  }

  if (!isAuthenticated || !user?.mosqueId) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 animate-in slide-in-from-left duration-200 lg:hidden">
            <DashboardSidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
              onMobileClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          <div key={pathname} className="route-fade-enter mx-auto w-full max-w-screen-2xl ds-section">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
