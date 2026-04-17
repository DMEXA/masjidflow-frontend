'use client';

import { Bell, Building2, Globe, Save, Settings, Shield, type LucideIcon } from 'lucide-react';
import type { UserRole } from '@/src/constants';

export type SettingsSectionKey =
  | 'general'
  | 'prayer'
  | 'salary'
  | 'payments'
  | 'notifications'
  | 'security';

export type SettingsNavItem = {
  key: SettingsSectionKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { key: 'general', label: 'General', href: '/dashboard/settings/general', icon: Building2 },
  { key: 'prayer', label: 'Prayer', href: '/dashboard/settings/prayer', icon: Globe },
  { key: 'salary', label: 'Salary', href: '/dashboard/settings/salary', icon: Settings },
  { key: 'payments', label: 'Payments', href: '/dashboard/settings/payments', icon: Save },
  { key: 'notifications', label: 'Notifications', href: '/dashboard/settings/notifications', icon: Bell },
  { key: 'security', label: 'Security', href: '/dashboard/settings/security', icon: Shield },
];

export function getSettingsNavItems(): SettingsNavItem[] {
  return SETTINGS_NAV_ITEMS;
}

export function getAllowedSettingsSections(role?: UserRole): SettingsSectionKey[] {
  if (role === 'super_admin' || role === 'admin') {
    return ['general', 'prayer', 'salary', 'payments', 'notifications', 'security'];
  }

  return ['security'];
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
