'use client';

import Link from 'next/link';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/src/store/auth.store';
import { getAllowedSettingsSections, getSettingsNavItems } from './_components/settings-modules';

export default function SettingsPage() {
  const { user, mosque } = useAuthStore();

  const allowed = getAllowedSettingsSections(user?.role);
  const navItems = getSettingsNavItems().filter((item) => allowed.includes(item.key));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-linear-to-r from-emerald-50 to-white p-4 sm:p-5">
        <div className="flex items-center gap-3">
          {mosque?.logo ? (
            <img
              src={mosque.logo}
              alt={mosque.name}
              className="h-14 w-14 rounded-full border border-emerald-200 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-700/80">Mosque Profile</p>
            <h1 className="text-lg font-semibold text-foreground">{mosque?.name || 'Your Mosque'}</h1>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-2">
        <p className="px-3 pt-2 pb-3 text-sm font-medium text-muted-foreground">Settings Options</p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                className="flex min-h-12 items-center justify-between rounded-xl px-3 py-2 transition hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

