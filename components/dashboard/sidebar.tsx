'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/src/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { donationsService } from '@/services/donations.service';
import { expensesService } from '@/services/expenses.service';
import {
  LogOut,
  Building2,
  CreditCard,
  ChevronLeft,
  Menu,
  ShieldCheck,
  Building,
  UserRound,
  ChartNoAxesCombined,
  Search,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getSidebarNavGroups } from '@/components/dashboard/sidebar-config';
import { queryKeys } from '@/lib/query-keys';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function DashboardSidebar({ collapsed, onToggle, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const {
    isAdmin,
    isSuperAdmin,
  } = usePermission();
  const { mosque, logout, user, token } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const isPlatformOnly = Boolean(user?.isPlatformAdmin) && !user?.mosqueId;
  const canViewPendingCount = isAdmin || isSuperAdmin;

  const pendingCountQuery = useQuery({
    queryKey: queryKeys.donationsPendingCount(mosque?.id),
    queryFn: () => donationsService.getPendingCount(),
    enabled: Boolean(mosque?.id) && Boolean(token) && canViewPendingCount,
  });

  const pendingExpenseCountQuery = useQuery({
    queryKey: queryKeys.expensesPendingCount(mosque?.id),
    queryFn: () => expensesService.getPendingCount(),
    enabled: Boolean(mosque?.id) && Boolean(token) && canViewPendingCount,
  });

  const pendingCount = pendingCountQuery.data?.count ?? 0;
  const pendingExpenseCount = pendingExpenseCountQuery.data?.count ?? 0;

  const navGroups: NavGroup[] = useMemo(() => {
    const groups = getSidebarNavGroups({
      role: user?.role,
      isMuqtadi: Boolean((user as { isMuqtadi?: boolean } | null)?.isMuqtadi),
      mosqueSlug: mosque?.slug,
      pendingDonationCount: canViewPendingCount ? pendingCount : undefined,
      pendingExpenseCount: canViewPendingCount ? pendingExpenseCount : undefined,
    });

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return groups;
    }

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0);
  }, [
    canViewPendingCount,
    pendingCount,
    pendingExpenseCount,
    searchQuery,
    mosque,
    user,
  ]);

  const platformAdminItems: NavItem[] = user?.isPlatformAdmin && user?.role !== 'treasurer'
    ? [
        { href: '/platform/mosques', label: 'Mosques', icon: Building },
        { href: '/register', label: 'Create Mosque', icon: Building2 },
        { href: '/platform/subscriptions', label: 'Platform Subscriptions', icon: ShieldCheck },
        { href: '/platform/payments', label: 'Payments', icon: CreditCard },
        { href: '/platform/settings', label: 'Platform Settings', icon: UserRound },
        { href: '/platform/audit-logs', label: 'Audit Logs', icon: ChartNoAxesCombined },
        { href: '/platform/trash', label: 'Trash', icon: Trash2 },
      ]
    : [];

  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const renderLink = (item: NavItem, subItem = false) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleNavClick}
        className={cn(
          'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          subItem && 'ml-6 py-2 text-[13px]',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        )}
      >
        {!subItem ? <item.icon className="h-5 w-5 shrink-0" /> : <span className="h-1.5 w-1.5 rounded-full bg-sidebar-foreground/60" />}
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span className="truncate">{item.label}</span>
            {item.badgeCount && item.badgeCount > 0 ? (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[11px]">
                {item.badgeCount}
              </Badge>
            ) : null}
          </div>
        )}
      </Link>
    );
  };

  if (isPlatformOnly) {
    return (
      <div className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link href="/platform" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
                <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-sidebar-foreground">MasjidFlow</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 py-4 overflow-y-auto">
          <nav className="flex flex-col gap-1 px-2">
            {!collapsed && (
              <p className="px-3 pb-2 text-xs uppercase tracking-wide text-sidebar-muted">
                Platform
              </p>
            )}
            {platformAdminItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-sidebar-foreground">MasjidFlow</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mosque Name */}
      {!collapsed && mosque && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-xs text-sidebar-muted">Current Mosque</p>
          <p className="truncate text-sm font-medium text-sidebar-foreground">{mosque.name}</p>
        </div>
      )}

      {!collapsed && (
        <div className="border-b border-sidebar-border px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sidebar-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search pages"
              className="h-9 border-sidebar-border bg-sidebar pl-8 text-sidebar-foreground placeholder:text-sidebar-foreground/60"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4 overflow-y-auto">
        <nav className="flex flex-col gap-1 px-2">
          {navGroups.length === 0 && !collapsed && (
            <p className="px-3 py-2 text-sm text-sidebar-foreground/70">No pages found</p>
          )}

          {navGroups.map((group, index) => (
            <div key={group.title}>
              {!collapsed && (
                <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => renderLink(item))}
              {index < navGroups.length - 1 && <Separator className="my-2 bg-sidebar-border/80" />}
            </div>
          ))}

          {platformAdminItems.length > 0 && (
            <>
              <Separator className="my-4 bg-sidebar-border" />
              {!collapsed && (
                <p className="px-3 pb-2 text-xs uppercase tracking-wide text-sidebar-muted">
                  Platform
                </p>
              )}
              {platformAdminItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
}

