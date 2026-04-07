import api from './api';
import type { Mosque } from '@/types';
import { compressImage } from '@/utils/compressImage';

export interface MosqueWithSettings extends Mosque {
  settings?: Record<string, unknown> | null;
}

export interface PrayerTimesSetting {
  fajr: { azanTime: string; iqamahTime?: string };
  zawal: { startTime: string; endTime: string };
  zuhr: { azanTime: string; iqamahTime?: string };
  asr: { azanTime: string; iqamahTime?: string };
  maghrib: { azanTime: string; iqamahTime?: string };
  isha: { azanTime: string; iqamahTime?: string };
  jumuah: { azanTime: string; iqamahTime?: string };
}

export interface TimeWithPeriodInput {
  time: string;
  period: 'AM' | 'PM';
}

export interface PrayerTimesUpdateInput {
  fajr: { azanTime: TimeWithPeriodInput; iqamahTime?: TimeWithPeriodInput };
  zawal: { startTime: TimeWithPeriodInput; endTime: TimeWithPeriodInput };
  zuhr: { azanTime: TimeWithPeriodInput; iqamahTime?: TimeWithPeriodInput };
  asr: { azanTime: TimeWithPeriodInput; iqamahTime?: TimeWithPeriodInput };
  maghrib: { azanTime: TimeWithPeriodInput; iqamahTime?: TimeWithPeriodInput };
  isha: { azanTime: TimeWithPeriodInput; iqamahTime?: TimeWithPeriodInput };
  jumuah: { azanTime: TimeWithPeriodInput; iqamahTime?: TimeWithPeriodInput };
}

export interface UpdateMosqueData {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  village?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
}

export async function updateMosqueProfile(mosqueId: string, data: UpdateMosqueData): Promise<Mosque> {
  const response = await api.patch<Mosque>(`/mosques/${mosqueId}`, data);
  return response.data;
}

export const mosqueService = {
  async getById(id: string): Promise<MosqueWithSettings> {
    const response = await api.get<MosqueWithSettings>(`/mosques/${id}`);
    return response.data;
  },

  async getBySlug(slug: string): Promise<Mosque> {
    const response = await api.get<Mosque>(`/mosques/${slug}`);
    return response.data;
  },

  async getPrayerTimes(mosqueId: string): Promise<PrayerTimesSetting | null> {
    const response = await api.get<{ prayerTimes: PrayerTimesSetting | null }>(`/mosques/${mosqueId}/prayer-times`);
    return response.data.prayerTimes;
  },

  async updatePrayerTimes(mosqueId: string, prayerTimes: PrayerTimesUpdateInput): Promise<PrayerTimesSetting> {
    const response = await api.patch<{ prayerTimes: PrayerTimesSetting }>(`/mosques/${mosqueId}/prayer-times`, prayerTimes);
    return response.data.prayerTimes;
  },

  async update(data: UpdateMosqueData): Promise<Mosque> {
    const response = await api.put<Mosque>('/mosques', data);
    return response.data;
  },

  async uploadLogo(file: File): Promise<{ url: string }> {
    const compressedFile = await compressImage(file);
    const formData = new FormData();
    formData.append('logo', compressedFile, compressedFile.name);
    const response = await api.post<{ url: string }>('/mosques/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getPublicInfo(slug: string): Promise<{
    name: string;
    address: string;
    city: string;
    description?: string;
    logo?: string;
  }> {
    const response = await api.get(`/mosques/${slug}/public`);
    return response.data;
  },

  async getSubscription(): Promise<{
    plan: string;
    expiresAt: string;
    isActive: boolean;
  }> {
    const response = await api.get('/mosques/subscription');
    return response.data;
  },

  async updateSubscription(planId: string): Promise<{ checkoutUrl: string }> {
    const response = await api.post<{ checkoutUrl: string }>('/mosques/subscription', { planId });
    return response.data;
  },
};
