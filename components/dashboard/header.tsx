'use client';

import { useAuthStore } from '@/src/store/auth.store';
import { formatRole } from '@/src/utils/format';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

interface DashboardHeaderProps {
  title?: string;
  onMobileMenuToggle: () => void;
}

export function DashboardHeader({ title, onMobileMenuToggle }: DashboardHeaderProps) {
  const { user, logout } = useAuthStore();
  const isMuqtadi = user?.role === 'muqtadi';

  const navItems = isMuqtadi
    ? [
        { href: '/app/dashboard', label: 'Dashboard' },
        { href: '/app/my-dues', label: 'Dues' },
        { href: '/app/pay', label: 'Pay' },
        { href: '/app/announcements', label: 'Announcements' },
      ]
    : [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/dashboard/donations', label: 'Donations' },
        { href: '/dashboard/expenses', label: 'Expenses' },
        { href: '/dashboard/funds', label: 'Funds' },
      ];

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        {title && (
          <h1 className="text-lg font-semibold text-foreground lg:text-xl">{title}</h1>
        )}
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Top navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role ? formatRole(user.role) : 'User'}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-foreground">{user?.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={isMuqtadi ? '/app/profile' : '/dashboard/profile'} className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={isMuqtadi ? '/app/profile' : '/dashboard/settings'} className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                {isMuqtadi ? 'Account' : 'Settings'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
