import api from './api';
import type { Muqtadi, PaginatedResponse } from '@/types';
import type { AuthResponse } from '@/types';

export type ImamSalarySystem = 'EQUAL' | 'CATEGORY';
export type MuqtadiDueStatus = 'PENDING' | 'PARTIAL' | 'PAID';
export type MuqtadiStatus = 'ACTIVE' | 'DISABLED';

export interface ImamSalarySettings {
  imamSalarySystem: 'EQUAL';
  totalMuqtadies: number;
  totalSalary: number;
  perHead: number;
}

export interface UpdateImamSalarySettingsPayload {
  imamSalarySystem?: 'EQUAL';
  totalMuqtadies: number;
  totalSalary: number;
  applyToCurrentMonth?: boolean;
  isNextMonth?: boolean;
  useCurrentSettingsForNextCycle?: boolean;
}

export interface NextCycleInfo {
  currentCycle: {
    month: number | null;
    year: number | null;
    createdAt: string | null;
  };
  nextCycle: {
    month: number;
    year: number;
    startsAt: string;
  };
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
  };
  settings: {
    totalMuqtadies: number;
    totalSalary: number;
    perHead: number;
  };
  hasPendingSettings: boolean;
}

export interface ImamSalaryCycle {
  id: string;
  month: number;
  year: number;
  salaryAmount: number;
  totalMuqtadies: number;
  perHead: number;
  ratePerPerson: number;
  systemType: 'EQUAL';
  createdAt: string;
}

export interface MuqtadiDue {
  id: string;
  cycleId: string;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;
  status: MuqtadiDueStatus;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  method: 'UPI' | 'CASH' | 'BANK';
  reference?: string | null;
  utr?: string | null;
  intentId?: string | null;
  status: 'PENDING' | 'VERIFIED';
  cycleId?: string | null;
  month?: number | null;
  year?: number | null;
  createdAt: string;
}

export interface MuqtadiDashboardApiResponse {
  mosque: {
    name: string;
    address: string | null;
  };
  prayerTimes: Record<string, unknown>;
  announcements: unknown[];
  month: number | null;
  year: number | null;
  totalDue: number;
  totalPaid: number;
  outstandingAmount: number;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  history: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string;
  }>;
}

export interface MuqtadiDetails {
  id: string;
  userId?: string | null;
  name: string;
  fatherName: string;
  email?: string | null;
  householdMembers: number;
  memberNames: string[];
  whatsappNumber?: string | null;
  isVerified?: boolean;
  category?: string | null;
  phone?: string | null;
  notes?: string | null;
  status: MuqtadiStatus;
  overview: {
    totalDue: number;
    totalPaid: number;
    outstandingAmount: number;
  };
  dues: MuqtadiDue[];
  payments: Array<{ id: string; action: string; details?: Record<string, unknown>; createdAt: string }>;
  history: Array<{ id: string; action: string; entity: string; details?: Record<string, unknown>; createdAt: string }>;
}

export interface EnableMuqtadiLoginPayload {
  email: string;
  password?: string;
  autoGeneratePassword?: boolean;
}

export interface EnableMuqtadiLoginResponse {
  muqtadiId: string;
  userId: string;
  email: string;
  generatedPassword: string | null;
  message: string;
}

export interface CreateMuqtadiAccountPayload {
  email: string;
  password: string;
}

export interface CreateMuqtadiAccountResponse {
  muqtadiId: string;
  userId: string;
  email: string;
  message: string;
}

export interface CreateMuqtadiPayload {
  name: string;
  fatherName: string;
  householdMembers: number;
  memberNames: string[];
  whatsappNumber?: string;
  phone?: string;
  notes?: string;
}

export interface UpdateMuqtadiPayload {
  name?: string;
  fatherName?: string;
  householdMembers?: number;
  memberNames?: string[];
  whatsappNumber?: string;
  phone?: string;
  notes?: string;
  status?: MuqtadiStatus;
}

export interface RecordMuqtadiPaymentPayload {
  muqtadiId: string;
  cycleId: string;
  amount: number;
  method: 'CASH' | 'UPI' | 'BANK';
  reference?: string;
  utr?: string;
  screenshotUrl?: string;
  notes?: string;
}

export interface InitiateMyPaymentPayload {
  cycleId: string;
  amount: number;
  reference?: string;
  utr?: string;
  screenshotUrl?: string;
}

export interface MuqtadiInvite {
  id: string;
  inviteUrl: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  maxUses?: number | null;
  usedCount: number;
}

export interface CreateMuqtadiInvitePayload {
  maxUses?: number;
}

export interface RegisterMuqtadiPayload {
  token: string;
  name: string;
  fatherName: string;
  phone: string;
  whatsappNumber?: string;
  email: string;
  password: string;
  householdMembers: number;
  memberNames: string[];
  captchaToken?: string;
}

export interface MuqtadiListStats {
  verifiedHouseholds: number;
  verifiedMuqtadies: number;
  pendingHouseholds: number;
  pendingMuqtadies: number;
}

export interface MuqtadiListResponse extends PaginatedResponse<Muqtadi> {
  pending: Muqtadi[];
  stats: MuqtadiListStats;
}

export interface MyDuesResponse extends PaginatedResponse<MuqtadiDue> {
  summary: {
    totalDue: number;
    totalPaid: number;
    outstandingAmount: number;
  };
}

export const muqtadisService = {
  async createInvite(payload?: CreateMuqtadiInvitePayload): Promise<{
    inviteUrl: string;
    id: string;
    expiresAt?: string;
    maxUses?: number | null;
    usedCount?: number;
  }> {
    const response = await api.post<{
      inviteUrl: string;
      id: string;
      expiresAt?: string;
      maxUses?: number | null;
      usedCount?: number;
    }>('/muqtadis/invite', payload ?? {});
    return response.data;
  },

  async getInvites(): Promise<MuqtadiInvite[]> {
    const response = await api.get<MuqtadiInvite[]>('/muqtadis/invites');
    return response.data;
  },

  async revokeInvite(id: string): Promise<void> {
    await api.delete(`/muqtadis/invites/${id}`);
  },

  async register(payload: RegisterMuqtadiPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/muqtadis/register', payload);
    return response.data;
  },

  async getAll(params?: { page?: number; limit?: number; search?: string }): Promise<MuqtadiListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);

    const suffix = query.toString();
    const response = await api.get(`/muqtadis${suffix ? `?${suffix}` : ''}`);
    const body = response.data;
    return {
      data: body.data,
      total: body.meta?.total ?? 0,
      page: body.meta?.page ?? 1,
      pageSize: body.meta?.limit ?? 20,
      totalPages: body.meta?.totalPages ?? 1,
      pending: Array.isArray(body.pending) ? body.pending : [],
      stats: {
        verifiedHouseholds: Number(body.stats?.verifiedHouseholds ?? 0),
        verifiedMuqtadies: Number(body.stats?.verifiedMuqtadies ?? 0),
        pendingHouseholds: Number(body.stats?.pendingHouseholds ?? 0),
        pendingMuqtadies: Number(body.stats?.pendingMuqtadies ?? 0),
      },
    };
  },

  async create(payload: CreateMuqtadiPayload): Promise<Muqtadi> {
    const response = await api.post<Muqtadi>('/muqtadis', payload);
    return response.data;
  },

  async update(id: string, payload: UpdateMuqtadiPayload): Promise<Muqtadi> {
    const response = await api.post<Muqtadi>(`/muqtadis/${id}/update`, payload);
    return response.data;
  },

  async getById(id: string): Promise<MuqtadiDetails> {
    const response = await api.get<MuqtadiDetails>(`/muqtadis/${id}`);
    return response.data;
  },

  async getSettings(): Promise<ImamSalarySettings> {
    const response = await api.get<ImamSalarySettings>('/muqtadis/settings');
    return response.data;
  },

  async getNextCycleInfo(): Promise<NextCycleInfo> {
    const response = await api.get<NextCycleInfo>('/muqtadis/next-cycle-info');
    return response.data;
  },

  async updateSettings(payload: UpdateImamSalarySettingsPayload): Promise<ImamSalarySettings> {
    const response = await api.post<ImamSalarySettings>('/muqtadis/settings', payload);
    return response.data;
  },

  async createSalaryMonth(payload: { month: number; year: number }): Promise<ImamSalaryCycle> {
    const response = await api.post<ImamSalaryCycle>('/salary/month', payload);
    return response.data;
  },

  async getSalaryMonths(): Promise<ImamSalaryCycle[]> {
    const response = await api.get<ImamSalaryCycle[]>('/salary/months');
    return response.data;
  },

  async getSalarySummary(): Promise<{
    totalSalary: number;
    totalMuqtadies: number;
    registeredMuqtadies: number;
    perHead: number;
  }> {
    const response = await api.get('/salary/summary');
    return response.data;
  },

  async recordPayment(payload: RecordMuqtadiPaymentPayload): Promise<MuqtadiDue> {
    const response = await api.post<MuqtadiDue>('/muqtadis/payments', payload);
    return response.data;
  },

  async disable(id: string): Promise<void> {
    await api.post(`/muqtadis/${id}/disable`);
  },

  async enable(id: string): Promise<void> {
    await api.post(`/muqtadis/${id}/enable`);
  },

  async verify(id: string): Promise<{ id: string; isVerified: boolean }> {
    const response = await api.patch<{ id: string; isVerified: boolean }>(`/muqtadis/${id}/verify`);
    return response.data;
  },

  async reject(id: string): Promise<{ id: string; isVerified: boolean }> {
    const response = await api.patch<{ id: string; isVerified: boolean }>(`/muqtadis/${id}/reject`);
    return response.data;
  },

  async enableLogin(id: string, payload: EnableMuqtadiLoginPayload): Promise<EnableMuqtadiLoginResponse> {
    const response = await api.post<EnableMuqtadiLoginResponse>(`/muqtadis/${id}/enable-login`, payload);
    return response.data;
  },

  async createAccount(id: string, payload: CreateMuqtadiAccountPayload): Promise<CreateMuqtadiAccountResponse> {
    const response = await api.post<CreateMuqtadiAccountResponse>(`/muqtadis/${id}/create-account`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/muqtadis/${id}`);
  },

  async getDashboard(): Promise<MuqtadiDashboardApiResponse> {
    const response = await api.get<MuqtadiDashboardApiResponse>('/muqtadi/dashboard');
    return response.data;
  },

  async initiateMyPayment(payload: InitiateMyPaymentPayload): Promise<{
    transactionId: string;
    intentId: string;
    upiDeepLink: string;
    amount: number;
    month: { month: number; year: number };
    status: 'PENDING' | 'VERIFIED';
    paymentMethods: {
      upiId?: string | null;
      bankAccount?: string | null;
      ifsc?: string | null;
      phoneNumber?: string | null;
    };
  }> {
    const response = await api.post('/muqtadis/my/pay', payload);
    return response.data;
  },

  async verifyPayment(transactionId: string): Promise<{ id: string; status: 'PENDING' | 'VERIFIED' }> {
    const response = await api.post('/muqtadis/payments/verify', { transactionId });
    return response.data;
  },

  async verifyPaymentByIntent(intentId: string, reference?: string): Promise<{ id: string; status: 'PENDING' | 'VERIFIED' }> {
    const response = await api.post('/payments/verify', { intentId, reference });
    return response.data;
  },

  async getMyDues(params?: { page?: number; limit?: number }): Promise<MyDuesResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const suffix = query.toString();
    const response = await api.get(`/muqtadis/my/dues${suffix ? `?${suffix}` : ''}`);
    const body = response.data;
    return {
      data: body.data,
      total: body.meta?.total ?? 0,
      page: body.meta?.page ?? 1,
      pageSize: body.meta?.limit ?? 20,
      totalPages: body.meta?.totalPages ?? 1,
      summary: {
        totalDue: Number(body.summary?.totalDue ?? 0),
        totalPaid: Number(body.summary?.totalPaid ?? 0),
        outstandingAmount: Number(body.summary?.outstandingAmount ?? 0),
      },
    };
  },

  async getMyProfile(): Promise<{
    id: string;
    name: string;
    category?: string | null;
    phone?: string | null;
    notes?: string | null;
    householdMembers: number;
    isVerified?: boolean;
    status: MuqtadiStatus;
    householdLocked: boolean;
  }> {
    const response = await api.get('/muqtadis/my/profile');
    return response.data;
  },

  async updateMyProfile(payload: { name?: string; phone?: string; notes?: string }) {
    const response = await api.post('/muqtadis/my/profile', payload);
    return response.data;
  },
};
