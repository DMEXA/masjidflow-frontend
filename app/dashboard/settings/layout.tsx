'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/auth.store';
import {
  SettingsProvider,
  getAllowedSettingsSections,
  getSettingsNavItems,
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
  const navItems = useMemo(
    () => getSettingsNavItems().filter((item) => allowedSections.includes(item.key)),
    [allowedSections],
  );

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
        <aside className="rounded-2xl border border-border bg-card p-2 lg:sticky lg:top-4 lg:h-[calc(100vh-8rem)]">
          {/* <div className="mb-2 px-3 py-2">
            <h2 className="text-base font-semibold text-foreground">Settings</h2>
            <p className="text-xs text-muted-foreground">Manage mosque and account preferences</p>
          </div> */}

          {/* <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1 lg:space-y-1 lg:gap-0">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={[
                    'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all min-h-12',
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-foreground hover:bg-muted hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav> */}
        </aside>

        <section className="min-w-0 rounded-2xl border-border bg-card p-2 sm:p-6 transition-all duration-200">
          {children}
        </section>
      </div>
    </SettingsProvider>
  );
}
