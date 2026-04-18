'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/auth.store';
import {
  SettingsProvider,
  getAllowedSettingsSections,
  type SettingsSectionKey,
} from './_components/settings-modules';

function parseSection(pathname: string): SettingsSectionKey | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'dashboard' || segments[1] !== 'settings') {
    return null;
  }
  const section = segments[2];
  if (!section) {
    return null;
  }
  if (['general', 'prayer', 'salary', 'payments', 'notifications', 'security'].includes(section)) {
    return section as SettingsSectionKey;
  }
  return null;
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();

  const allowedSections = useMemo(() => getAllowedSettingsSections(user?.role), [user?.role]);

  useEffect(() => {
    const current = parseSection(pathname);
    const isRootSettings = pathname === '/dashboard/settings';
    if (isRootSettings && allowedSections.length === 1 && allowedSections[0] === 'security') {
      router.replace('/dashboard/settings/security');
      return;
    }

    if (current && !allowedSections.includes(current)) {
      router.replace(`/dashboard/settings/${allowedSections[0] ?? 'security'}`);
    }
  }, [allowedSections, pathname, router]);

  const currentSection = parseSection(pathname);
  const isRootBlocked = pathname === '/dashboard/settings' && allowedSections.length === 1 && allowedSections[0] === 'security';
  const blockedRoute = isRootBlocked || (currentSection ? !allowedSections.includes(currentSection) : false);

  if (blockedRoute) {
    return null;
  }

  return (
    <SettingsProvider>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <section className="min-w-0 rounded-2xl border-border bg-card p-2 sm:p-6 transition-all duration-200">
          {children}
        </section>
      </div>
    </SettingsProvider>
  );
}
