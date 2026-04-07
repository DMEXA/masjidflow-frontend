'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
  };
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = 'Back',
  action,
  children,
}: PageHeaderProps) {
  const pathname = usePathname();
  const autoBackHref = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'dashboard' || parts.length <= 2) {
      return null;
    }
    return `/${parts.slice(0, -1).join('/')}`;
  }, [pathname]);

  const resolvedBackHref = backHref ?? autoBackHref;

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {resolvedBackHref ? (
          <Button variant="ghost" size="sm" asChild className="mb-2 h-8 px-2">
            <Link href={resolvedBackHref}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {action && (
          <Button onClick={action.onClick} disabled={action.disabled}>
            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
