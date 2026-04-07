import api from './api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const IMPORTANT_NOTIFICATION_TYPES = [
  'PAYMENT_VERIFIED',
  'PAYMENT_REJECTED',
  'ANNOUNCEMENT_NEW',
] as const;

export const notificationsService = {
  async getMyNotifications(): Promise<AppNotification[]> {
    const response = await api.get('/notifications');
    return response.data as AppNotification[];
  },

  async markAsRead(notificationId: string): Promise<AppNotification> {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data as AppNotification;
  },
};
