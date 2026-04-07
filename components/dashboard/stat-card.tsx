import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  trend?: number;
  trendLabel?: string;
  icon: LucideIcon;
  tone?: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray';
  iconClassName?: string;
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, { card: string; icon: string }> = {
  green: {
    card: 'border-emerald-200 bg-emerald-50/60',
    icon: 'bg-emerald-100 text-emerald-700',
  },
  yellow: {
    card: 'border-amber-200 bg-amber-50/60',
    icon: 'bg-amber-100 text-amber-700',
  },
  red: {
    card: 'border-rose-200 bg-rose-50/60',
    icon: 'bg-rose-100 text-rose-700',
  },
  blue: {
    card: 'border-sky-200 bg-sky-50/60',
    icon: 'bg-sky-100 text-sky-700',
  },
  purple: {
    card: 'border-violet-200 bg-violet-50/60',
    icon: 'bg-violet-100 text-violet-700',
  },
  gray: {
    card: 'border-slate-200 bg-slate-50/80',
    icon: 'bg-slate-200 text-slate-700',
  },
};

export function StatCard({
  title,
  value,
  description,
  trend,
  trendLabel,
  icon: Icon,
  tone = 'gray',
  iconClassName,
}: StatCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;
  const toneStyle = toneStyles[tone];

  return (
    <Card className={cn('shadow-sm', toneStyle.card)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-foreground/80">{title}</CardTitle>
        <div className={cn('rounded-lg p-2', iconClassName || toneStyle.icon)}>
          <Icon className={cn('h-4 w-4', iconClassName ? 'text-current' : 'text-inherit')} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-3xl font-bold leading-none text-foreground">{value}</div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
        {trend !== undefined && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {isPositiveTrend ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={isPositiveTrend ? 'text-green-500' : 'text-red-500'}>
              {isPositiveTrend ? '+' : ''}{trend.toFixed(1)}%
            </span>
            {trendLabel && (
              <span className="text-muted-foreground">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
