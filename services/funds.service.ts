import api from './api';
import type { FundSummary } from '@/types';
import { DEFAULT_PAGE_LIMIT, getSafeLimit } from '@/src/utils/pagination';

export interface Fund {
  id: string;
  name: string;
  description?: string | null;
  type: 'MASJID' | 'BAITUL_MAAL' | 'ZAKAT';
  allowedCategories: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FundPayload {
  name: string;
  description?: string;
  type?: 'MASJID' | 'BAITUL_MAAL' | 'ZAKAT' | 'SADAQAH';
  categories?: string[];
}

export interface FundCategoryPayload {
  category: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface FundListOptions extends RequestOptions {
  page?: number;
  limit?: number;
}

export interface FundDetailsResponse {
  fund: Fund;
  summary: {
    totalDonations: number;
    totalExpenses: number;
    balance: number;
    donationCount: number;
    expenseCount: number;
  };
  recentDonations: Array<{
    id: string;
    donorName?: string | null;
    donationStatus: 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    amount: number;
    createdAt: string;
  }>;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    createdAt: string;
  }>;
}

let fundsSummaryInFlight: Promise<FundSummary[]> | null = null;
const fundDetailsInFlight = new Map<string, Promise<FundDetailsResponse>>();

export const fundsService = {
  async getAll(options?: FundListOptions): Promise<Fund[]> {
    const safeLimit = getSafeLimit(options?.limit, DEFAULT_PAGE_LIMIT);
    const params: Record<string, string | number> = { limit: safeLimit };

    if (options?.page) {
      params.page = options.page;
    }

    console.debug('[fundsService.getAll] params', {
      page: options?.page,
      limit: safeLimit,
    });

    const response = await api.get('/funds', {
      params,
      signal: options?.signal,
    });
    return response.data;
  },

  async getById(id: string, options?: RequestOptions): Promise<Fund> {
    const response = await api.get<Fund>(`/funds/${id}`, { signal: options?.signal });
    return response.data;
  },

  async getSummary(options?: RequestOptions): Promise<FundSummary[]> {
    if (!options?.signal && fundsSummaryInFlight) {
      return fundsSummaryInFlight;
    }

    const safeLimit = getSafeLimit(undefined, DEFAULT_PAGE_LIMIT);
    console.debug('[fundsService.getSummary] params', { limit: safeLimit });

    const request = api
      .get('/funds', {
        params: { limit: safeLimit },
        signal: options?.signal,
      })
      .then((response) => response.data as FundSummary[])
      .finally(() => {
        if (!options?.signal) {
          fundsSummaryInFlight = null;
        }
      });

    if (!options?.signal) {
      fundsSummaryInFlight = request;
    }

    return request;
  },

  async getDetails(id: string, options?: RequestOptions): Promise<FundDetailsResponse> {
    if (!options?.signal && fundDetailsInFlight.has(id)) {
      return fundDetailsInFlight.get(id)!;
    }

    const request = api
      .get<FundDetailsResponse>(`/funds/${id}/details`, {
        signal: options?.signal,
      })
      .then((response) => response.data)
      .finally(() => {
        if (!options?.signal) {
          fundDetailsInFlight.delete(id);
        }
      });

    if (!options?.signal) {
      fundDetailsInFlight.set(id, request);
    }

    return request;
  },

  async create(data: FundPayload): Promise<Fund> {
    const response = await api.post<Fund>('/funds', data);
    return response.data;
  },

  async update(id: string, data: FundPayload): Promise<Fund> {
    const response = await api.patch<Fund>(`/funds/${id}`, data);
    return response.data;
  },

  async addCategory(id: string, data: FundCategoryPayload): Promise<Fund> {
    const response = await api.post<Fund>(`/funds/${id}/categories`, data);
    return response.data;
  },

  async deleteCategory(id: string, category: string): Promise<Fund> {
    const response = await api.delete<Fund>(`/funds/${id}/categories/${encodeURIComponent(category)}`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/funds/${id}`);
  },

  async restore(id: string): Promise<void> {
    await api.patch(`/funds/${id}/restore`);
  },

  async getInactive(options?: RequestOptions): Promise<Fund[]> {
    const response = await api.get<Fund[]>('/funds/inactive', {
      signal: options?.signal,
    });
    return response.data;
  },

  async getPublicByMosqueId(
    mosqueId: string,
    options?: RequestOptions,
  ): Promise<Array<{ id: string; name: string; description?: string | null }>> {
    const safeLimit = getSafeLimit(undefined, 50);
    console.debug('[fundsService.getPublicByMosqueId] params', {
      mosqueId,
      limit: safeLimit,
    });

    const response = await api.get('/funds/public', {
      params: { mosqueId, limit: safeLimit },
      signal: options?.signal,
    });
    return response.data;
  },
};
