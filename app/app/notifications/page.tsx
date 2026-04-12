'use client';

import { useMemo } from 'react';
import { BellRing, Banknote, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MuqtadiBackButton } from '@/components/muqtadi/back-button';
import { useNotificationsQuery } from '@/hooks/useNotificationsQuery';
import {
  notificationsService,
  type AppNotification,
} from '@/services/notifications.service';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { Skeleton } from '@/components/ui/skeleton';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { useAuthStore } from '@/src/store/auth.store';
import { queryKeys } from '@/lib/query-keys';

function getNotificationIcon(type: string) {
  if (type.startsWith('PAYMENT')) {
    return <Banknote className="h-4 w-4 text-emerald-700" />;
  }

  if (type.startsWith('ANNOUNCEMENT')) {
    return <BellRing className="h-4 w-4 text-sky-700" />;
  }

  return <BellRing className="h-4 w-4 text-muted-foreground" />;
}

function formatRelativeTime(dateInput: string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) return 'Just now';

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (diffMs < 2 * day) return 'Yesterday';

  const days = Math.floor(diffMs / day);
  return `${days} days ago`;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const notificationsKey = queryKeys.notifications(user?.id);
  const notificationsQuery = useNotificationsQuery();

  const notifications = notificationsQuery.data ?? [];

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationsKey });
      const previous = queryClient.getQueryData<AppNotification[]>(notificationsKey) ?? [];

      queryClient.setQueryData<AppNotification[]>(notificationsKey, (old = []) =>
        old.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );

      return { previous };
    },
    onError: (error, _notificationId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsKey, context.previous);
      }
      toast.error(getErrorMessage(error, 'Failed to mark notification as read'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  if (notificationsQuery.isLoading) {
    return (
      <div className="ds-stack">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (notificationsQuery.isError) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="ds-stack">
      <div className="rounded-xl border p-4">
        <MuqtadiBackButton />
      </div>

      <div className="rounded-xl border p-4">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Important updates for your account.</p>
        <p className="mt-1 text-xs text-muted-foreground">Unread: {unreadCount}</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <ListEmptyState
              title="No notifications yet"
              description="You will see payment and announcement updates here."
              actionLabel="Go To Dashboard"
              actionHref="/app/dashboard"
              icon={<BellRing className="h-5 w-5" />}
              className="min-h-44"
            />
          </CardContent>
        </Card>
      ) : (
        notifications.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant="ghost"
            className="h-auto w-full p-0 text-left"
            onClick={() => {
              if (!item.isRead) {
                markAsReadMutation.mutate(item.id);
              }
            }}
          >
            <Card className={item.isRead ? 'border-[#d8e5ce] bg-white' : 'border-primary/40 bg-primary/8'}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/70">
                    {getNotificationIcon(item.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className={`text-base text-[#22492b] ${item.isRead ? 'font-semibold' : 'font-bold'}`}>
                      {item.title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">{formatRelativeTime(item.createdAt)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[#314235]">{item.message}</p>
              </CardContent>
            </Card>
          </Button>
        ))
      )}
    </div>
  );
}
