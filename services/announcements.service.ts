import api from './api';

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

export const announcementsService = {
  async getAll(mosqueId?: string): Promise<AnnouncementItem[]> {
    const response = await api.get<AnnouncementItem[]>('/announcements', {
      params: mosqueId ? { mosqueId } : undefined,
    });
    return response.data;
  },

  async create(data: { title: string; message: string }): Promise<AnnouncementItem> {
    const response = await api.post<AnnouncementItem>('/announcements', data);
    return response.data;
  },

  async remove(id: string): Promise<{ deleted: boolean }> {
    const response = await api.delete<{ deleted: boolean }>(`/announcements/${id}`);
    return response.data;
  },

  async update(id: string, data: { title?: string; message?: string }): Promise<AnnouncementItem> {
    const response = await api.patch<AnnouncementItem>(`/announcements/${id}`, data);
    return response.data;
  },
};
