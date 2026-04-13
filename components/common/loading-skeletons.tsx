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
      <Skeleton className="h-28 w-full rounded-2xl app-shimmer" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-2xl app-shimmer" />
        <Skeleton className="h-40 w-full rounded-2xl app-shimmer" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl app-shimmer" />
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
      <Skeleton className="h-14 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-36 w-full rounded-2xl app-shimmer" />
      <Skeleton className="h-12 w-full rounded-xl app-shimmer" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl app-shimmer" />
        <Skeleton className="h-20 w-full rounded-xl app-shimmer" />
        <Skeleton className="h-20 w-full rounded-xl app-shimmer" />
      </div>
    </div>
  );
}

export function MuqtadiProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-10 w-full rounded-xl app-shimmer" />
      <Skeleton className="h-11 w-full rounded-xl app-shimmer" />
    </div>
  );
}

export function PublicDonateSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Skeleton className="h-12 w-52 rounded-xl app-shimmer" />
      <Skeleton className="h-44 w-full rounded-2xl app-shimmer" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-2xl app-shimmer" />
        <Skeleton className="h-40 w-full rounded-2xl app-shimmer" />
      </div>
      <Skeleton className="h-56 w-full rounded-2xl app-shimmer" />
    </div>
  );
}
