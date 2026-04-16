import api from './api';

export interface UpdateMyProfilePayload {
  name: string;
  email?: string;
  phone?: string;
  fatherName?: string | null;
}

export interface UserProfileResponse {
  id: string;
  name: string;
  fatherName?: string | null;
  email: string;
  phone?: string | null;
  updatedAt: string;
}

export interface CorrectPhonePayload {
  currentPassword: string;
  phone: string;
}

export const usersService = {
  async updateMyProfile(payload: UpdateMyProfilePayload): Promise<UserProfileResponse> {
    const response = await api.patch<UserProfileResponse>('/users/me', payload);
    return response.data;
  },

  async correctMyPhone(payload: CorrectPhonePayload): Promise<{ message: string; phone: string; phoneVerified: boolean }> {
    const response = await api.patch<{ message: string; phone: string; phoneVerified: boolean }>('/users/me/phone', payload);
    return response.data;
  },
};