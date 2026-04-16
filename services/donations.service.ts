import api from './api';
import type { Donation, PaginatedResponse } from '@/types';
import type { PaymentType } from '@/src/constants';
import { DEFAULT_PAGE_LIMIT, getSafeLimit } from '@/src/utils/pagination';
import { prepareProofUploadFile, type UploadStage } from '@/utils/compressImage';

const MAX_DONATION_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const ALLOWED_DONATION_SCREENSHOT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type DonationStatus = 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface CreateDonationData {
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  amount: number | string;
  paymentType: PaymentType | string;
  customPaymentMethod?: string;
  description?: string;
  receipt?: string;
  fundId?: string;
  upiTransactionId?: string;
}

export interface UpdateDonationData {
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  amount?: number | string;
  paymentType?: PaymentType | string;
  customPaymentMethod?: string;
  description?: string;
  receipt?: string;
  fundId?: string;
  upiTransactionId?: string;
}

export interface DonationFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  paymentType?: PaymentType | string;
  search?: string;
  fundId?: string;
  donationStatus?: DonationStatus;
}

export interface PublicDonationConfig {
  mosqueId: string;
  mosqueName: string;
  upiId: string;
  upiName: string;
  phoneNumber?: string | null;
  bankAccountName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  paymentInstructions?: string | null;
  qrLogo?: string | null;
  funds: Array<{
    id: string;
    name: string;
    type: 'MASJID' | 'ZAKAT' | 'BAITUL_MAAL';
  }>;
}

export interface DonationQrConfig {
  mosqueId: string;
  mosqueName: string;
  mosqueSlug: string;
  donationPath: string;
}

export interface InitiatePublicDonationData {
  mosqueId: string;
  fundId: string;
  amount: number | string;
  deviceId?: string;
  donorPhone: string;
}

export interface InitiatePublicDonationResponse {
  donationId: string;
  intentId: string;
  upiDeepLink: string;
  expiresAt: string;
}

export interface CreatePublicDonationProofData {
  mosqueId?: string;
  fundId: string;
  amount: number | string;
  donorPhone: string;
  donorName?: string;
  screenshotUrl?: string;
  upiTransactionId?: string;
  verificationNote?: string;
}

export interface UpdatePublicDonationProofData {
  donorName?: string;
  phoneNumber?: string;
  screenshotUrl?: string;
  upiTransactionId?: string;
  verificationNote?: string;
}

export interface PublicDonationReceipt {
  mosqueName: string;
  amount: number;
  fundName: string;
  donorName?: string | null;
  donationDate: string;
  intentId: string;
  verificationStatus: 'VERIFIED';
  donationId: string;
}

export interface PublicDonationDetails {
  id: string;
  amount: number;
  donationStatus: DonationStatus;
  donorName?: string | null;
  createdAt: string;
  screenshotUrl?: string | null;
}

export interface PublicDonationDraft {
  id: string;
  intentId: string;
  amount: number;
  donationStatus: DonationStatus;
  donorName?: string | null;
  donorPhone?: string | null;
  upiTransactionId?: string | null;
  screenshotUrl?: string | null;
  fundId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyDonationPayload {
  upiTransactionId?: string;
  verificationNote?: string;
  manualConfirm?: boolean;
}

export const donationsService = {
  async getAll(filters?: DonationFilters): Promise<PaginatedResponse<Donation>> {
    const params = new URLSearchParams();
    const safeLimit = getSafeLimit(filters?.limit, DEFAULT_PAGE_LIMIT);
    if (filters) {
      if (filters.page) params.append('page', String(filters.page));
      params.append('limit', String(safeLimit));
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.paymentType) params.append('paymentType', filters.paymentType);
      if (filters.fundId) params.append('fundId', filters.fundId);
      if (filters.donationStatus) params.append('donationStatus', filters.donationStatus);
    } else {
      params.append('limit', String(safeLimit));
    }

    console.debug('[donationsService.getAll] params', {
      page: filters?.page,
      limit: safeLimit,
      search: filters?.search,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      paymentType: filters?.paymentType,
      fundId: filters?.fundId,
      donationStatus: filters?.donationStatus,
    });

    const response = await api.get(`/donations?${params.toString()}`);
    const body = response.data;
    return {
      data: body.data,
      total: body.meta?.total ?? 0,
      page: body.meta?.page ?? 1,
      pageSize: body.meta?.limit ?? 20,
      totalPages: body.meta?.totalPages ?? 1,
    };
  },

  async getById(id: string): Promise<Donation> {
    const response = await api.get<Donation>(`/donations/${id}`);
    return response.data;
  },

  async create(data: CreateDonationData): Promise<Donation> {
    const response = await api.post<Donation>('/donations', data);
    return response.data;
  },

  async update(id: string, data: UpdateDonationData): Promise<Donation> {
    const response = await api.patch<Donation>(`/donations/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.patch(`/donations/${id}`, { softDelete: true });
  },

  async getTrash(): Promise<Donation[]> {
    const response = await api.get<Donation[]>('/donations/trash');
    return response.data;
  },

  async restore(id: string): Promise<void> {
    await api.patch(`/donations/${id}/restore`);
  },

  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/donations/${id}/permanent`);
  },

  async uploadReceipt(
    file: File,
    onStageChange?: (stage: UploadStage) => void,
  ): Promise<{ url: string }> {
    const compressedFile = await prepareProofUploadFile(file, { onStageChange });
    onStageChange?.('uploading');
    const formData = new FormData();
    formData.append('receipt', compressedFile, compressedFile.name);
    const response = await api.post<{ url: string }>(
      '/donations/upload-receipt',
      formData,
    );
    return response.data;
  },

  async getStats(): Promise<{
    totalThisMonth: number;
    totalLastMonth: number;
    trend: number;
    byPaymentType: Record<PaymentType, number>;
  }> {
    const response = await api.get('/donations/stats');
    return response.data;
  },

  async getPublicConfig(mosqueId?: string): Promise<PublicDonationConfig> {
    const params = mosqueId ? `?mosqueId=${encodeURIComponent(mosqueId)}` : '';
    const response = await api.get<PublicDonationConfig>(`/donations/public/config${params}`);
    return response.data;
  },

  async getPublicConfigBySlug(mosqueSlug: string): Promise<PublicDonationConfig> {
    const response = await api.get<PublicDonationConfig>(
      `/donations/public/config/${encodeURIComponent(mosqueSlug)}`,
    );
    return response.data;
  },

  async getPublicDonationDraft(params: {
    mosqueId: string;
    fundId?: string;
    donorPhone: string;
  }): Promise<PublicDonationDraft | null> {
    const query = new URLSearchParams({
      mosqueId: params.mosqueId,
      donorPhone: params.donorPhone,
    });
    if (params.fundId) {
      query.append('fundId', params.fundId);
    }
    const response = await api.get<PublicDonationDraft | null>(`/donations/public/draft?${query.toString()}`);
    return response.data;
  },

  async getQrConfig(): Promise<DonationQrConfig> {
    const response = await api.get<DonationQrConfig>('/donations/qr-config');
    return response.data;
  },

  async initiatePublicDonation(data: InitiatePublicDonationData): Promise<InitiatePublicDonationResponse> {
    const response = await api.post<InitiatePublicDonationResponse>('/donations/public/initiate', {
      ...data,
      amount: typeof data.amount === 'string' ? data.amount.trim() : data.amount,
    });
    return response.data;
  },

  async uploadDonationScreenshot(
    file: File,
    mosqueId?: string,
    onStageChange?: (stage: UploadStage) => void,
  ): Promise<{ url: string }> {
    const compressedFile = await prepareProofUploadFile(file, {
      maxBytes: MAX_DONATION_SCREENSHOT_BYTES,
      allowedImageTypes: [...ALLOWED_DONATION_SCREENSHOT_TYPES],
      onStageChange,
    });

    onStageChange?.('uploading');
    const formData = new FormData();
    formData.append('screenshot', compressedFile, compressedFile.name);
    const params = mosqueId ? `?mosqueId=${encodeURIComponent(mosqueId)}` : '';
    const response = await api.post<{ url: string }>(
      `/donations/public/upload-screenshot${params}`,
      formData,
    );
    return response.data;
  },

  async submitPublicDonationProof(data: CreatePublicDonationProofData): Promise<Donation> {
    const response = await api.post<Donation>('/donations/public/proof', data);
    return response.data;
  },

  async getPublicDonationStatus(id: string): Promise<Donation> {
    const response = await api.get<Donation>(`/donations/public/status/${id}`);
    return response.data;
  },

  async getPublicById(id: string): Promise<PublicDonationDetails> {
    const response = await api.get<PublicDonationDetails>(`/donations/public/${id}`);
    return response.data;
  },

  async getPublicReceipt(intentId: string): Promise<PublicDonationReceipt> {
    const response = await api.get<PublicDonationReceipt>(
      `/donations/public/receipt/${encodeURIComponent(intentId)}`,
    );
    return response.data;
  },

  getPublicReceiptPdfUrl(intentId: string): string {
    return `/donations/public/receipt/${encodeURIComponent(intentId)}/pdf`;
  },

  async updatePublicDonationProof(id: string, data: UpdatePublicDonationProofData): Promise<Donation> {
    const response = await api.patch<Donation>(`/donations/public/status/${id}/proof`, data);
    return response.data;
  },

  async getPending(): Promise<Donation[]> {
    const response = await api.get<Donation[]>('/donations/pending');
    return response.data;
  },

  async getPendingCount(): Promise<{ count: number }> {
    const response = await api.get<{ count: number }>('/donations/pending-count');
    return response.data;
  },

  async approvePending(id: string, payload?: VerifyDonationPayload): Promise<Donation> {
    const response = await api.patch<Donation>(`/donations/${id}/verify`, payload ?? {});
    return response.data;
  },

  async rejectPending(id: string): Promise<Donation> {
    const response = await api.patch<Donation>(`/donations/${id}/reject`);
    return response.data;
  },

  async bulkVerifyPending(donationIds: string[]): Promise<{
    verifiedCount: number;
    totalAmountVerified: number;
    donationIds: string[];
  }> {
    const response = await api.post('/donations/bulk-verify', { donationIds });
    return response.data;
  },

  async reconcile(rows: Array<{ transactionId?: string; amount: number; date?: string; note?: string }>): Promise<{
    rows: Array<{
      transactionId: string;
      amount: number;
      date: string | null;
      status: 'MATCHED' | 'NO_MATCH' | 'AMOUNT_MISMATCH' | 'NO_TRANSACTION_ID';
      donationId: string | null;
      donationAmount?: number;
      donationStatus?: DonationStatus;
    }>;
    summary: {
      matched: number;
      noMatch: number;
      amountMismatch: number;
      noTransactionId: number;
    };
  }> {
    const response = await api.post('/donations/reconcile', { rows });
    return response.data;
  },

  async sendManualReminder(id: string): Promise<{ sent: boolean }> {
    const response = await api.post(`/donations/${id}/send-reminder`);
    return response.data;
  },
};
