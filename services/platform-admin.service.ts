import api from './api';
import { DEFAULT_PAGE_LIMIT, getSafeLimit } from '@/src/utils/pagination';

export interface PlatformAdminStats {
  totalMosques: number;
  totalUsers: number;
  activeSubscriptions: number;
  trialMosques: number;
  expiredMosques: number;
  totalDonationsAmount: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PlatformMosqueRow {
  id: string;
  name: string;
  adminEmail: string | null;
  userCount: number;
  plan: string;
  createdAt: string;
  isSuspended: boolean;
}

export interface PlatformMosqueDetails {
  id: string;
  name: string;
  slug: string;
  isSuspended: boolean;
  createdAt: string;
  trialEndsAt: string | null;
  memberCount: number;
  admin: {
    id: string;
    name: string;
    email: string;
  } | null;
  subscription: {
    id: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string | null;
    price: number | null;
    updatedAt: string;
  } | null;
  paymentHistory: Array<{
    id: string;
    amount: number;
    duration: number;
    intentId: string;
    status: 'PENDING' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
    proofUrl?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    verifiedAt?: string;
  }>;
}

export interface PlatformUserRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  mosque: string;
  role: string;
  lastLogin: string | null;
}

export interface PlatformSubscriptionRow {
  id: string;
  mosqueId: string;
  mosqueName: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string | null;
  price: number | null;
  createdAt: string;
}

export interface PlatformPlan {
  id: string;
  name: string;
  code: string;
  price: number;
  durationDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPlatformPlanDto {
  name: string;
  code: string;
  price: number | string;
  durationDays: number | string;
  isActive?: boolean;
}

export interface PlatformPaymentSettings {
  upiId: string;
  upiName: string;
  subscription?: {
    monthly?: number;
    sixMonths?: number;
    yearly?: number;
  };
  basePrice?: number;
  price1Month?: number;
  price6Months?: number;
  price12Months?: number;
  bankAccount?: string;
  ifsc?: string;
  bankName?: string;
  updatedAt: string;
}

export interface PlatformAuditLogRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
  mosqueId: string;
  mosqueName: string;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface PlatformSubscriptionPaymentRow {
  id: string;
  mosqueId: string;
  mosqueName: string;
  amount: number;
  duration: number;
  intentId: string;
  status: 'PENDING' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
  proofUrl?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export type PlatformSubscriptionPaymentDetails = PlatformSubscriptionPaymentRow;

export interface PlatformAnalytics {
  mosquesPerMonth: Array<{ month: string; count: number }>;
  usersPerMonth: Array<{ month: string; count: number }>;
  revenuePerMonth: Array<{ month: string; amount: number }>;
  donationsProcessed: number;
}

export interface PlatformSystemStatus {
  databaseConnected: boolean;
  activeMosques: number;
  activeUsers: number;
  pendingDonationProofs: number;
  serverUptime: number;
}

export interface PlatformDeletedMosqueRow {
  id: string;
  name: string;
  adminEmail: string | null;
  createdAt: string;
  deletedAt: string | null;
}

interface PaginationQuery {
  page?: number;
  limit?: number;
  mosqueId?: string;
}

function normalizePaginationQuery(query: PaginationQuery = {}, fallbackLimit: number = DEFAULT_PAGE_LIMIT): PaginationQuery {
  return {
    ...query,
    limit: getSafeLimit(query.limit, fallbackLimit),
  };
}

export const platformAdminService = {
  async getStats(): Promise<PlatformAdminStats> {
    const response = await api.get<PlatformAdminStats>('/admin/stats');
    return response.data;
  },

  async getMosques(query: PaginationQuery = {}): Promise<PaginatedResponse<PlatformMosqueRow>> {
    const safeQuery = normalizePaginationQuery(query);
    console.debug('[platformAdminService.getMosques] params', safeQuery);
    const response = await api.get<PaginatedResponse<PlatformMosqueRow>>('/admin/mosques', {
      params: safeQuery,
    });
    return response.data;
  },

  async getMosqueDetails(mosqueId: string): Promise<PlatformMosqueDetails> {
    const response = await api.get<PlatformMosqueDetails>(`/admin/mosques/${mosqueId}`);
    return response.data;
  },

  async getDeletedMosques(query: PaginationQuery = {}): Promise<PaginatedResponse<PlatformDeletedMosqueRow>> {
    const safeQuery = normalizePaginationQuery(query);
    console.debug('[platformAdminService.getDeletedMosques] params', safeQuery);
    const response = await api.get<PaginatedResponse<PlatformDeletedMosqueRow>>('/admin/mosques/trash', {
      params: safeQuery,
    });
    return response.data;
  },

  async getUsers(query: PaginationQuery = {}): Promise<PaginatedResponse<PlatformUserRow>> {
    const safeQuery = normalizePaginationQuery(query);
    console.debug('[platformAdminService.getUsers] params', safeQuery);
    const response = await api.get<PaginatedResponse<PlatformUserRow>>('/admin/users', {
      params: safeQuery,
    });
    return response.data;
  },

  async getSubscriptions(
    query: PaginationQuery = {},
  ): Promise<PaginatedResponse<PlatformSubscriptionRow>> {
    const safeQuery = normalizePaginationQuery(query);
    console.debug('[platformAdminService.getSubscriptions] params', safeQuery);
    const response = await api.get<PaginatedResponse<PlatformSubscriptionRow>>('/admin/subscriptions', {
      params: safeQuery,
    });
    return response.data;
  },

  async getMosqueBilling(
    query: PaginationQuery = {},
  ): Promise<PaginatedResponse<PlatformSubscriptionRow>> {
    const safeQuery = normalizePaginationQuery(query);
    console.debug('[platformAdminService.getMosqueBilling] params', safeQuery);
    const response = await api.get<PaginatedResponse<PlatformSubscriptionRow>>('/admin/billing/mosques', {
      params: safeQuery,
    });
    return response.data;
  },

  async getPlans(): Promise<PlatformPlan[]> {
    const response = await api.get<PlatformPlan[]>('/admin/plans');
    return response.data;
  },

  async createPlan(payload: UpsertPlatformPlanDto): Promise<PlatformPlan> {
    const response = await api.post<PlatformPlan>('/admin/plans', payload);
    return response.data;
  },

  async updatePlan(id: string, payload: Partial<UpsertPlatformPlanDto>): Promise<PlatformPlan> {
    const response = await api.patch<PlatformPlan>(`/admin/plans/${id}`, payload);
    return response.data;
  },

  async deletePlan(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/plans/${id}`);
    return response.data;
  },

  async getPlatformPaymentSettings(): Promise<PlatformPaymentSettings | null> {
    const response = await api.get<PlatformPaymentSettings | null>('/admin/payment-settings');
    return response.data;
  },

  async upsertPlatformPaymentSettings(
    payload: Omit<PlatformPaymentSettings, 'updatedAt'>,
  ): Promise<PlatformPaymentSettings> {
    const response = await api.put<PlatformPaymentSettings>('/admin/payment-settings', payload);
    return response.data;
  },

  async upsertPlatformSubscriptionSettings(payload: {
    basePrice?: number | string;
    price1Month?: number | string;
    price6Months?: number | string;
    price12Months?: number | string;
  }): Promise<PlatformPaymentSettings> {
    const response = await api.patch<PlatformPaymentSettings>('/platform/settings/subscription', payload);
    return response.data;
  },

  async upsertPlatformPaymentMethodSettings(payload: {
    upiId: string;
    upiName: string;
    bankAccount?: string;
    ifsc?: string;
    bankName?: string;
  }): Promise<PlatformPaymentSettings> {
    const response = await api.patch<PlatformPaymentSettings>('/platform/settings/payment', payload);
    return response.data;
  },

  async getGlobalAuditLogs(
    query: PaginationQuery = {},
  ): Promise<PaginatedResponse<PlatformAuditLogRow>> {
    const safeQuery = normalizePaginationQuery(query, 50);
    console.debug('[platformAdminService.getGlobalAuditLogs] params', safeQuery);
    const response = await api.get<PaginatedResponse<PlatformAuditLogRow>>('/admin/audit-logs', {
      params: safeQuery,
    });
    return response.data;
  },

  async getSubscriptionPayments(
    query: PaginationQuery = {},
  ): Promise<PaginatedResponse<PlatformSubscriptionPaymentRow>> {
    const safeQuery = normalizePaginationQuery(query);
    console.debug('[platformAdminService.getSubscriptionPayments] params', safeQuery);
    const response = await api.get<PaginatedResponse<PlatformSubscriptionPaymentRow>>('/admin/payments', {
      params: safeQuery,
    });
    return response.data;
  },

  async getSubscriptionPaymentById(id: string): Promise<PlatformSubscriptionPaymentDetails> {
    const response = await api.get<PlatformSubscriptionPaymentDetails>(`/admin/payments/${id}`);
    return response.data;
  },

  async verifySubscriptionPayment(mosqueId: string, intentId: string): Promise<PlatformSubscriptionPaymentRow> {
    const response = await api.post<PlatformSubscriptionPaymentRow>(
      `/admin/payments/${mosqueId}/${encodeURIComponent(intentId)}/verify`,
    );
    return response.data;
  },

  async rejectSubscriptionPayment(mosqueId: string, intentId: string): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(
      `/admin/payments/${mosqueId}/${encodeURIComponent(intentId)}/reject`,
    );
    return response.data;
  },

  async getAnalytics(): Promise<PlatformAnalytics> {
    const response = await api.get<PlatformAnalytics>('/admin/analytics');
    return response.data;
  },

  async getSystemStatus(): Promise<PlatformSystemStatus> {
    const response = await api.get<PlatformSystemStatus>('/admin/system');
    return response.data;
  },

  async suspendMosque(mosqueId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/admin/mosques/${mosqueId}/suspend`);
    return response.data;
  },

  async activateMosque(mosqueId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/admin/mosques/${mosqueId}/activate`);
    return response.data;
  },

  async deleteMosque(mosqueId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/mosques/${mosqueId}`);
    return response.data;
  },

  async restoreMosque(mosqueId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/admin/mosques/${mosqueId}/restore`);
    return response.data;
  },

  async permanentlyDeleteMosque(mosqueId: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/admin/mosques/${mosqueId}/permanent`);
    return response.data;
  },

  async bulkDeleteMosques(ids: string[]): Promise<{ success: boolean; count: number }> {
    const response = await api.post<{ success: boolean; count: number }>('/platform/mosques/bulk-delete', { ids });
    return response.data;
  },

  async bulkRestoreMosques(ids: string[]): Promise<{ success: boolean; count: number }> {
    const response = await api.post<{ success: boolean; count: number }>('/platform/mosques/bulk-restore', { ids });
    return response.data;
  },

  async bulkPermanentlyDeleteMosques(ids: string[]): Promise<{ success: boolean; count: number }> {
    const response = await api.post<{ success: boolean; count: number }>('/platform/mosques/bulk-permanent-delete', { ids });
    return response.data;
  },

  async disableUser(userId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/admin/users/${userId}/disable`);
    return response.data;
  },

  async enableUser(userId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/admin/users/${userId}/enable`);
    return response.data;
  },
};
