'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { MobileBottomNav } from '@/components/dashboard/mobile-bottom-nav';
import { useAuthStore } from '@/src/store/auth.store';
import { AuthLoadingScreen } from '@/components/common/auth-loading-screen';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, authStatus, checkAuth, user } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace('/login');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'muqtadi') {
      router.replace('/app/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.isPlatformAdmin && !user?.mosqueId) {
      router.replace('/platform');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      const allowedRoles = ['super_admin', 'admin', 'treasurer', 'viewer', 'member'];
      if (!allowedRoles.includes(user.role) && user.role !== 'muqtadi') {
        router.replace('/dashboard');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (authStatus === 'loading' || isLoading) {
    return <AuthLoadingScreen message="Loading dashboard..." />;
  }

  const allowedRoles = ['super_admin', 'admin', 'treasurer', 'viewer', 'member'];
  if (user?.isPlatformAdmin && !user?.mosqueId) {
    return null;
  }
  if (authStatus !== 'authenticated' || !isAuthenticated || user?.role === 'muqtadi' || (user?.role && !allowedRoles.includes(user.role))) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
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

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          <div className="mx-auto w-full max-w-screen-2xl ds-section">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
