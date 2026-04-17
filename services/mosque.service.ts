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

const FRONTEND_PRAYER_TIMING_FALLBACK: PrayerTimesSetting = {
  fajr: { azanTime: '05:00', iqamahTime: '05:20' },
  zawal: { startTime: '12:00', endTime: '12:20' },
  zuhr: { azanTime: '13:00', iqamahTime: '13:20' },
  asr: { azanTime: '17:00', iqamahTime: '17:20' },
  maghrib: { azanTime: '18:30', iqamahTime: '18:35' },
  isha: { azanTime: '20:00', iqamahTime: '20:20' },
  jumuah: { azanTime: '13:15', iqamahTime: '13:30' },
};

function isValidPrayerTimesShape(input: unknown): input is PrayerTimesSetting {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  const obj = input as Record<string, unknown>;
  const prayers = ['fajr', 'zuhr', 'asr', 'maghrib', 'isha', 'jumuah'] as const;

  for (const prayer of prayers) {
    const item = obj[prayer];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false;
    }
    const prayerItem = item as Record<string, unknown>;
    if (typeof prayerItem.azanTime !== 'string' || prayerItem.azanTime.trim().length === 0) {
      return false;
    }
    if (typeof prayerItem.iqamahTime !== 'string' || prayerItem.iqamahTime.trim().length === 0) {
      return false;
    }
  }

  const zawal = obj.zawal;
  if (!zawal || typeof zawal !== 'object' || Array.isArray(zawal)) {
    return false;
  }

  const zawalItem = zawal as Record<string, unknown>;
  return (
    typeof zawalItem.startTime === 'string' &&
    zawalItem.startTime.trim().length > 0 &&
    typeof zawalItem.endTime === 'string' &&
    zawalItem.endTime.trim().length > 0
  );
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

function extractDataPayload(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  const source = input as Record<string, unknown>;
  return 'data' in source ? source.data : source;
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
    try {
      const response = await api.get<{ prayerTimes: PrayerTimesSetting | null }>(`/mosques/${mosqueId}/prayer-times`);
      const payload = (extractDataPayload(response.data) as { prayerTimes?: PrayerTimesSetting | null } | null)
        ?? (response.data as { prayerTimes?: PrayerTimesSetting | null } | null);
      const prayerTimes = payload?.prayerTimes;

      if (isValidPrayerTimesShape(prayerTimes)) {
        return prayerTimes;
      }

      // Strict frontend safety fallback for malformed/empty payloads.
      return FRONTEND_PRAYER_TIMING_FALLBACK;
    } catch {
      // Strict frontend safety fallback for request failures.
      return FRONTEND_PRAYER_TIMING_FALLBACK;
    }
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
