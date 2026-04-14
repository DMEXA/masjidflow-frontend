import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

type CardSkeletonProps = {
  className?: string;
};

type ListSkeletonProps = {
  count?: number;
  className?: string;
};

type PageSkeletonProps = {
  rows?: number;
  cardCount?: number;
};

export function CardSkeleton({ className = 'h-24 w-full' }: CardSkeletonProps) {
  return (
    <Card className="border-border">
      <CardContent className="pt-4">
        <Skeleton className={className} />
      </CardContent>
    </Card>
  );
}

export function ListSkeleton({ count = 4, className = 'h-24 w-full' }: ListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={`list-skeleton-${index}`} className={className} />
      ))}
    </div>
  );
}

export function DrawerSkeleton() {
  return (
    <div className="space-y-3 pt-4">
      <Skeleton className="h-10 w-2/3 rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}

export function PageSkeleton({ rows = 1, cardCount = 3 }: PageSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={`page-header-skeleton-${index}`} className="h-12 w-full rounded-xl" />
      ))}
      <ListSkeleton count={cardCount} className="h-20 w-full" />
    </div>
  );
}

export function MuqtadiHeroSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Dashboard</p>
        <Skeleton className="mt-2 h-6 w-2/3 rounded-lg app-shimmer" />
        <Skeleton className="mt-2 h-4 w-1/2 rounded-lg app-shimmer" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Next Prayer</p>
          <Skeleton className="mt-3 h-8 w-1/2 rounded-lg app-shimmer" />
          <Skeleton className="mt-2 h-5 w-1/3 rounded-lg app-shimmer" />
          <Skeleton className="mt-4 h-9 w-36 rounded-xl app-shimmer" />
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Dues Summary</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Skeleton className="h-16 w-full rounded-xl app-shimmer" />
            <Skeleton className="h-16 w-full rounded-xl app-shimmer" />
            <Skeleton className="h-16 w-full rounded-xl app-shimmer" />
          </div>
          <Skeleton className="mt-3 h-2.5 w-full rounded-full app-shimmer" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function MuqtadiResolveSkeleton() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <Skeleton className="h-7 w-1/2 rounded-lg" />
      <Skeleton className="h-4 w-11/12 rounded-lg" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function MuqtadiDuesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Payment History</p>
        <Skeleton className="mt-3 h-20 w-full rounded-2xl app-shimmer" />
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Payments</p>
        <Skeleton className="mt-3 h-10 w-full rounded-xl app-shimmer" />
        <div className="mt-3 space-y-3">
          <Skeleton className="h-20 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-20 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-20 w-full rounded-xl app-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function MuqtadiProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Profile</p>
        <div className="mt-3 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Household</p>
        <div className="mt-3 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-11 w-full rounded-xl app-shimmer" />
        </div>
      </div>
    </div>
  );
}

export function PublicDonateSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Donate</p>
        <Skeleton className="mt-3 h-6 w-56 rounded-lg app-shimmer" />
        <Skeleton className="mt-2 h-4 w-3/4 rounded-lg app-shimmer" />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl app-shimmer" />
        <Skeleton className="mt-3 h-10 w-full rounded-xl app-shimmer" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-2xl app-shimmer" />
        <Skeleton className="h-40 w-full rounded-2xl app-shimmer" />
      </div>
    </div>
  );
}

export function PendingApprovalSkeleton() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Household Pending Approval</p>
        <Skeleton className="mt-3 h-5 w-2/3 rounded-lg app-shimmer" />
        <Skeleton className="mt-2 h-4 w-full rounded-lg app-shimmer" />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
          <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
        </div>
      </div>
    </div>
  );
}
