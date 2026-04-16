import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Megaphone,
  HandCoins,
  CircleDollarSign,
  Wallet,
  Receipt,
  Users,
  UserPlus,
  ScrollText,
  FileText,
  ShieldCheck,
  Settings,
  ChartNoAxesCombined,
  Trash2,
} from 'lucide-react';
import type { UserRole } from '@/src/constants';

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

export interface SidebarNavGroup {
  title: string;
  items: SidebarNavItem[];
}

export interface SidebarConfigInput {
  role?: UserRole;
  isMuqtadi?: boolean;
  mosqueSlug?: string;
  pendingDonationCount?: number;
  pendingExpenseCount?: number;
}

export interface MobileSidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active: (pathname: string) => boolean;
}

function buildPublicPages(isMuqtadi: boolean, mosqueSlug?: string): SidebarNavGroup {
  return {
    title: 'Public Pages',
    items: [
      { href: '/app/meekaat', label: 'Prayer Times', icon: LayoutDashboard },
      { href: '/app/announcements', label: 'Announcements', icon: FileText },
      ...(mosqueSlug ? [{ href: `/donate/${mosqueSlug}`, label: 'Donations', icon: HandCoins }] : []),
      ...(isMuqtadi ? [{ href: '/app/my-dues', label: 'Imam Salary', icon: ScrollText }] : []),
    ],
  };
}

function filterEmptyGroups(groups: SidebarNavGroup[]): SidebarNavGroup[] {
  return groups.filter((group) => group.items.length > 0);
}

export function getSidebarNavGroups(input: SidebarConfigInput): SidebarNavGroup[] {
  const role = input.role;
  const pendingDonationCount = input.pendingDonationCount;
  const pendingExpenseCount = input.pendingExpenseCount;
  const isMuqtadi = Boolean(input.isMuqtadi);
  const mosqueSlug = input.mosqueSlug;

  if (role === 'muqtadi') {
    return filterEmptyGroups([
      {
        title: 'Overview',
        items: [{ href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'Payments',
        items: [
          { href: '/app/my-dues', label: 'My Dues', icon: ScrollText },
          { href: '/app/pay', label: 'Pay', icon: HandCoins },
        ],
      },
      {
        title: 'Community',
        items: [
          { href: '/app/meekaat', label: 'Prayer Times', icon: LayoutDashboard },
          { href: '/app/announcements', label: 'Announcements', icon: FileText },
          { href: mosqueSlug ? `/app/donate/${mosqueSlug}` : '/app/donate', label: 'Donate', icon: HandCoins },
          { href: '/app/notifications', label: 'Notifications', icon: ShieldCheck },
        ],
      },
      {
        title: 'Account',
        items: [{ href: '/app/profile', label: 'Profile', icon: UserPlus }],
      },
    ]);
  }

  if (role === 'super_admin' || role === 'admin') {
    return filterEmptyGroups([
      {
        title: 'Overview',
        items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'Financials',
        items: [
          { href: '/dashboard/funds', label: 'Funds', icon: Wallet },
          { href: '/dashboard/donations', label: 'Donations', icon: HandCoins, badgeCount: pendingDonationCount },
          { href: '/dashboard/expenses', label: 'Expenses', icon: CircleDollarSign, badgeCount: pendingExpenseCount },
          { href: '/dashboard/reconciliation', label: 'Reconciliation', icon: Receipt },
        ],
      },
      {
        title: 'Members',
        items: [
          { href: '/dashboard/muqtadis', label: 'Households', icon: Users },
          { href: '/dashboard/members', label: 'Members', icon: UserPlus },
          { href: '/dashboard/invites', label: 'Invites', icon: UserPlus },
        ],
      },
      {
        title: 'Imam Salary',
        items: [
          { href: '/dashboard/imam-salary/cycles', label: 'Cycles', icon: ScrollText },
          { href: '/dashboard/imamfund', label: 'Imam Fund', icon: CircleDollarSign },
        ],
      },
      {
        title: 'Communication',
        items: [{ href: '/dashboard/announcements', label: 'Announcements', icon: FileText }],
      },
      {
        title: 'System',
        items: [
          { href: '/dashboard/profile', label: 'Profile', icon: UserPlus },
          { href: '/dashboard/subscription', label: 'Subscription', icon: ShieldCheck },
          { href: '/dashboard/settings', label: 'Settings', icon: Settings },
          { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: ChartNoAxesCombined },
          { href: '/trash', label: 'Trash', icon: Trash2 },
        ],
      },
      buildPublicPages(isMuqtadi, mosqueSlug),
    ]);
  }

  if (role === 'treasurer') {
    return filterEmptyGroups([
      {
        title: 'Overview',
        items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'Financials',
        items: [
          { href: '/dashboard/donations', label: 'Donations', icon: HandCoins },
          { href: '/dashboard/expenses', label: 'Expenses', icon: CircleDollarSign },
          { href: '/dashboard/funds', label: 'Funds', icon: Wallet },
        ],
      },
      {
        title: 'System',
        items: [
          { href: '/dashboard/profile', label: 'Profile', icon: UserPlus },
          { href: '/dashboard/settings', label: 'Security', icon: ShieldCheck },
        ],
      },
      buildPublicPages(isMuqtadi, mosqueSlug),
    ]);
  }

  if (role === 'viewer' || role === 'member') {
    return filterEmptyGroups([
      {
        title: 'Overview',
        items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'Financials',
        items: [
          { href: '/dashboard/donations', label: 'Donations', icon: HandCoins },
          { href: '/dashboard/expenses', label: 'Expenses', icon: CircleDollarSign },
          { href: '/dashboard/funds', label: 'Funds', icon: Wallet },
        ],
      },
      {
        title: 'Members',
        items: [{ href: '/dashboard/muqtadis', label: 'Households', icon: Users }],
      },
      {
        title: 'System',
        items: [
          { href: '/dashboard/profile', label: 'Profile', icon: UserPlus },
          { href: '/dashboard/settings', label: 'Security', icon: ShieldCheck },
        ],
      },
      buildPublicPages(isMuqtadi, mosqueSlug),
    ]);
  }

  return [];
}

export function getMobileSidebarNavItems(role?: UserRole, mosqueSlug?: string): MobileSidebarNavItem[] {
  if (role === 'muqtadi') {
    return [
      {
        href: '/app/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        active: (pathname) => pathname === '/app/dashboard' || pathname === '/app',
      },
      {
        href: '/app/my-dues',
        label: 'Dues',
        icon: ScrollText,
        active: (pathname) => pathname.startsWith('/app/my-dues') || pathname.startsWith('/app/contributions'),
      },
      {
        href: '/app/pay',
        label: 'Pay',
        icon: CircleDollarSign,
        active: (pathname) => pathname.startsWith('/app/pay'),
      },
      {
        href: mosqueSlug ? `/app/donate/${mosqueSlug}` : '/app/donate',
        label: 'Donate',
        icon: HandCoins,
        active: (pathname) => pathname.startsWith('/donate') || pathname.startsWith('/app/donate'),
      },
      {
        href: '/app/announcements',
        label: 'Announ.',
        icon: Megaphone,
        active: (pathname) => pathname.startsWith('/app/announcements'),
      },
      {
        href: '/app/profile',
        label: 'Profile',
        icon: UserPlus,
        active: (pathname) => pathname.startsWith('/app/profile'),
      },
    ];
  }

  if (role === 'treasurer') {
    return [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        active: (pathname) => pathname === '/dashboard',
      },
      {
        href: '/dashboard/donations',
        label: 'Donations',
        icon: HandCoins,
        active: (pathname) => pathname.startsWith('/dashboard/donations') || pathname === '/dashboard/reconciliation',
      },
      {
        href: '/dashboard/expenses',
        label: 'Expenses',
        icon: CircleDollarSign,
        active: (pathname) => pathname.startsWith('/dashboard/expenses'),
      },
      {
        href: '/dashboard/funds',
        label: 'Funds',
        icon: Wallet,
        active: (pathname) => pathname.startsWith('/dashboard/funds'),
      },
      {
        href: '/dashboard/profile',
        label: 'Profile',
        icon: UserPlus,
        active: (pathname) => pathname.startsWith('/dashboard/profile'),
      },
    ];
  }

  if (role === 'viewer' || role === 'member') {
    return [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        active: (pathname) => pathname === '/dashboard',
      },
      {
        href: '/dashboard/donations',
        label: 'Donations',
        icon: HandCoins,
        active: (pathname) => pathname.startsWith('/dashboard/donations'),
      },
      {
        href: '/dashboard/expenses',
        label: 'Expenses',
        icon: CircleDollarSign,
        active: (pathname) => pathname.startsWith('/dashboard/expenses'),
      },
      {
        href: '/dashboard/funds',
        label: 'Funds',
        icon: Wallet,
        active: (pathname) => pathname.startsWith('/dashboard/funds'),
      },
      {
        href: '/dashboard/muqtadis',
        label: 'Households',
        icon: Users,
        active: (pathname) => pathname.startsWith('/dashboard/muqtadis'),
      },
      {
        href: '/dashboard/profile',
        label: 'Profile',
        icon: UserPlus,
        active: (pathname) => pathname.startsWith('/dashboard/profile'),
      },
    ];
  }

  return [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: (pathname) => pathname === '/dashboard',
    },
    {
      href: '/dashboard/donations',
      label: 'Donations',
      icon: HandCoins,
      active: (pathname) => pathname.startsWith('/dashboard/donations') || pathname === '/dashboard/reconciliation',
    },
    {
      href: '/dashboard/profile',
      label: 'Profile',
      icon: UserPlus,
      active: (pathname) => pathname.startsWith('/dashboard/profile'),
    },
    {
      href: '/dashboard/expenses',
      label: 'Expenses',
      icon: CircleDollarSign,
      active: (pathname) => pathname.startsWith('/dashboard/expenses'),
    },
    {
      href: '/dashboard/funds',
      label: 'Funds',
      icon: Wallet,
      active: (pathname) => pathname.startsWith('/dashboard/funds'),
    },
    {
      href: '/dashboard/muqtadis',
      label: 'Households',
      icon: Users,
      active: (pathname) => pathname.startsWith('/dashboard/muqtadis'),
    },
    {
      href: '/dashboard/settings',
      label: 'Settings',
      icon: Settings,
      active: (pathname) => pathname.startsWith('/dashboard/settings') || pathname === '/dashboard/settings',
    },
    {
      href: '/trash',
      label: 'Trash',
      icon: Trash2,
      active: (pathname) => pathname === '/trash',
    },
  ];
}
