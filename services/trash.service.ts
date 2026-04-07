import api from './api';

export type TrashType = 'members' | 'donations' | 'expenses';

export interface TrashMeta {
  total: number;
  page: number;
  limit: number;
}

export interface TrashResponse<T> {
  data: T[];
  meta: TrashMeta;
}

export interface TrashMemberItem {
  id: string;
  deletedAt: string | null;
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

export interface TrashDonationItem {
  id: string;
  donorName: string | null;
  amount: number;
  deletedAt: string | null;
  createdByName?: string | null;
  createdByRole?: string | null;
  deletedByName?: string | null;
  deletedByRole?: string | null;
  fundType?: string | null;
}

export interface TrashExpenseItem {
  id: string;
  createdByName: string | null;
  amount: number;
  deletedAt: string | null;
  createdByRole?: string | null;
  deletedByName?: string | null;
  deletedByRole?: string | null;
}

export const trashService = {
  async getTrash<T>(type: TrashType, page = 1, limit = 10): Promise<TrashResponse<T>> {
    const response = await api.get<TrashResponse<T>>('/trash', {
      params: { type, page, limit },
    });
    return response.data;
  },

  async restore(type: TrashType, id: string): Promise<void> {
    await api.patch(`/trash/${type}/${id}/restore`);
  },

  async permanentDelete(type: TrashType, id: string): Promise<void> {
    await api.delete(`/trash/${type}/${id}`);
  },
};
