import api from './api';

export interface UpdateMyProfilePayload {
  name: string;
  email?: string;
}

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  updatedAt: string;
}

export const usersService = {
  async updateMyProfile(payload: UpdateMyProfilePayload): Promise<UserProfileResponse> {
    const response = await api.patch<UserProfileResponse>('/users/me', payload);
    return response.data;
  },
};