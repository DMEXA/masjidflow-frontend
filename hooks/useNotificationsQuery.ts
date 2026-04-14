import { useQuery } from '@tanstack/react-query';
import {
  IMPORTANT_NOTIFICATION_TYPES,
  notificationsService,
  type AppNotification,
} from '@/services/notifications.service';
import { useAuthStore } from '@/src/store/auth.store';
import { queryKeys } from '@/lib/query-keys';
import { muqtadiQueryPolicy } from '@/lib/muqtadi-query-policy';

const MAX_NOTIFICATIONS = 30;

function isImportantNotification(notification: AppNotification): boolean {
  const notificationType = notification?.type ?? '';
  return IMPORTANT_NOTIFICATION_TYPES.includes(
    notificationType as (typeof IMPORTANT_NOTIFICATION_TYPES)[number],
  );
}

export function useNotificationsQuery() {
  const { user, isAuthenticated } = useAuthStore();
  const notificationsKey = queryKeys.notifications(user?.id);

  return useQuery<AppNotification[]>({
    queryKey: notificationsKey,
    queryFn: async () => {
      const allNotifications = await notificationsService.getMyNotifications();
      return allNotifications
        .filter(isImportantNotification)
        .slice(0, MAX_NOTIFICATIONS);
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: muqtadiQueryPolicy.notifications.staleTime,
    gcTime: muqtadiQueryPolicy.notifications.gcTime,
    refetchInterval: muqtadiQueryPolicy.notifications.refetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: muqtadiQueryPolicy.notifications.refetchOnWindowFocus,
    refetchOnReconnect: true,
  });
}

export function useConditionalNotificationsQuery(enabled = true) {
  const { user, isAuthenticated } = useAuthStore();
  const notificationsKey = queryKeys.notifications(user?.id);

  return useQuery<AppNotification[]>({
    queryKey: notificationsKey,
    queryFn: async () => {
      const allNotifications = await notificationsService.getMyNotifications();
      return allNotifications
        .filter(isImportantNotification)
        .slice(0, MAX_NOTIFICATIONS);
    },
    enabled: enabled && !!isAuthenticated && !!user,
    staleTime: muqtadiQueryPolicy.notifications.staleTime,
    gcTime: muqtadiQueryPolicy.notifications.gcTime,
    refetchInterval: muqtadiQueryPolicy.notifications.refetchInterval,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: muqtadiQueryPolicy.notifications.refetchOnWindowFocus,
    refetchOnReconnect: true,
  });
}

export function useUnreadImportantNotificationCount() {
  const query = useNotificationsQuery();
  const unreadCount = (query.data ?? []).filter((item) => !item.isRead).length;

  return {
    ...query,
    unreadCount,
  };
}


