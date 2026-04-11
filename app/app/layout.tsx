'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/auth.store';
import { AuthLoadingScreen } from '@/components/common/auth-loading-screen';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';

export default function AppRouteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { checkAuth, isAuthenticated, isLoading, authStatus, hasTriedBootstrap, user } = useAuthStore();
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
    }
  }, [authStatus, hasTriedBootstrap, isAuthenticated, user?.mosqueId, router]);

  if (authStatus === 'loading' || isLoading) {
    return <AuthLoadingScreen message="Loading app..." />;
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
          <div className="mx-auto w-full max-w-screen-2xl ds-section">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
