'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/src/store/auth.store';
import { getMobileSidebarNavItems } from '@/components/dashboard/sidebar-config';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, mosque } = useAuthStore();
  const visibleNavItems = getMobileSidebarNavItems(user?.role, mosque?.slug);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85 lg:hidden">
      <ul className="mx-auto grid max-w-screen-sm gap-1 px-2 py-2" style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))` }}>
        {visibleNavItems.map((item) => {
          const isActive = item.active(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center rounded-md px-1 py-1 text-[10px] font-medium leading-tight transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                aria-label={item.label}
              >
                <item.icon className="mb-1 h-4 w-4 shrink-0" />
                <span className="max-w-full text-center text-[9px] leading-none whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
