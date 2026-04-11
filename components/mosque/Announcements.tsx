'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { announcementsService, type AnnouncementItem } from '@/services/announcements.service';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/src/utils/error';

type SortOrder = 'newest' | 'oldest';

type AnnouncementsProps = {
  mosqueId: string;
};

export function Announcements({ mosqueId }: AnnouncementsProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  const announcementsQuery = useQuery<AnnouncementItem[]>({
    queryKey: [...queryKeys.announcements, mosqueId],
    enabled: Boolean(mosqueId),
    queryFn: () => announcementsService.getAll(mosqueId),
    staleTime: 30_000,
  });

  const announcements = announcementsQuery.data ?? [];

  const sortedAnnouncements = useMemo(
    () =>
      [...announcements].sort((a, b) => {
        const left = new Date(a.createdAt).getTime();
        const right = new Date(b.createdAt).getTime();
        return sortOrder === 'newest' ? right - left : left - right;
      }),
    [announcements, sortOrder],
  );

  useEffect(() => {
    if (announcementsQuery.error) {
      toast.error(getErrorMessage(announcementsQuery.error, 'Failed to load announcements'));
    }
  }, [announcementsQuery.error]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-muted/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Announcements</h1>
            <p className="text-sm text-muted-foreground">Important updates from your mosque committee.</p>
          </div>
          <select
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm sm:w-40"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {announcementsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <ListEmptyState
              title="No announcements yet"
              description="Updates from your mosque committee will appear here."
              className="min-h-44"
            />
          </CardContent>
        </Card>
      ) : (
        sortedAnnouncements.map((item) => (
          <Card key={item.id} className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-foreground">{item.title}</CardTitle>
              <CardDescription className="text-xs">
                {new Intl.DateTimeFormat('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }).format(new Date(item.createdAt))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{item.message}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
