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
