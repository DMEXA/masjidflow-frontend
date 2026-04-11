import { useQuery } from '@tanstack/react-query';
import {
  IMPORTANT_NOTIFICATION_TYPES,
  notificationsService,
  type AppNotification,
} from '@/services/notifications.service';
import { useAuthStore } from '@/src/store/auth.store';

const MAX_NOTIFICATIONS = 30;

function isImportantNotification(notification: AppNotification): boolean {
  const notificationType = notification?.type ?? '';
  return IMPORTANT_NOTIFICATION_TYPES.includes(
    notificationType as (typeof IMPORTANT_NOTIFICATION_TYPES)[number],
  );
}

export function useNotificationsQuery() {
  const { user, isAuthenticated } = useAuthStore();

  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const allNotifications = await notificationsService.getMyNotifications();
      return allNotifications
        .filter(isImportantNotification)
        .slice(0, MAX_NOTIFICATIONS);
    },
    enabled: !!isAuthenticated && !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useConditionalNotificationsQuery(enabled = true) {
  const { user, isAuthenticated } = useAuthStore();

  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const allNotifications = await notificationsService.getMyNotifications();
      return allNotifications
        .filter(isImportantNotification)
        .slice(0, MAX_NOTIFICATIONS);
    },
    enabled: enabled && !!isAuthenticated && !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}


