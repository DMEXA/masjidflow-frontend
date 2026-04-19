import api from './api';
import type { Muqtadi, PaginatedResponse } from '@/types';
import type { AuthResponse } from '@/types';

export type ImamSalarySystem = 'EQUAL' | 'CATEGORY';
export type MuqtadiDueStatus = 'PENDING' | 'PARTIAL' | 'PAID';
export type MuqtadiStatus = 'ACTIVE' | 'DISABLED';
export type ContributionMode = 'HOUSEHOLD' | 'PERSON';
export type MuqtadiAccountState = 'OFFLINE' | 'PENDING_SETUP' | 'ACTIVE';

export interface ImamSalarySettings {
  contributionMode: ContributionMode;
  contributionType: ContributionMode;
  contributionAmount: number;
  imamSalarySystem: 'EQUAL';
  totalMuqtadies: number;
  totalSalary: number;
  perHead: number;
  settingsLocked?: boolean;
  settingsLockReason?: string | null;
}

export interface UpdateImamSalarySettingsPayload {
  contributionMode?: ContributionMode;
  contributionAmount?: number;
  contributionType?: ContributionMode;
  imamSalarySystem?: 'EQUAL';
  totalMuqtadies?: number;
  totalSalary?: number;
  applyToCurrentMonth?: boolean;
  isNextMonth?: boolean;
  useCurrentSettingsForNextCycle?: boolean;
}

export interface NextCycleInfo {
  hasActiveCycle: boolean;
  currentCycle: null | {
    month: number | null;
    year: number | null;
    createdAt: string | null;
  };
  nextCycle: null | {
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
    contributionMode: ContributionMode;
    contributionType: ContributionMode;
    contributionAmount: number;
    totalMuqtadies: number;
    totalSalary: number;
    perHead: number;
  };
  hasPendingSettings: boolean;
  settingsLocked?: boolean;
  settingsLockReason?: string | null;
}

const EMPTY_IMAM_SALARY_SETTINGS: ImamSalarySettings = {
  contributionMode: 'HOUSEHOLD',
  contributionType: 'HOUSEHOLD',
  contributionAmount: 0,
  imamSalarySystem: 'EQUAL',
  totalMuqtadies: 0,
  totalSalary: 0,
  perHead: 0,
  settingsLocked: false,
  settingsLockReason: null,
};

const EMPTY_NEXT_CYCLE_INFO: NextCycleInfo = {
  hasActiveCycle: false,
  currentCycle: null,
  nextCycle: null,
  timeRemaining: {
    days: 0,
    hours: 0,
    minutes: 0,
  },
  settings: {
    contributionMode: 'HOUSEHOLD',
    contributionType: 'HOUSEHOLD',
    contributionAmount: 0,
    totalMuqtadies: 0,
    totalSalary: 0,
    perHead: 0,
  },
  hasPendingSettings: false,
  settingsLocked: false,
  settingsLockReason: null,
};

function extractDataPayload(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  const source = input as Record<string, unknown>;
  if ('data' in source) {
    return source.data;
  }

  return source;
}

function normalizeSettings(input: unknown): ImamSalarySettings {
  const source = (input as Record<string, unknown> | null) ?? null;
  const contributionModeRaw = source?.contributionMode ?? source?.contributionType;
  const contributionMode: ContributionMode = contributionModeRaw === 'PERSON' ? 'PERSON' : 'HOUSEHOLD';
  const contributionAmount = Number(source?.contributionAmount ?? source?.totalSalary ?? 0);
  const totalMuqtadies = Number(source?.totalMuqtadies ?? 0);
  const totalSalary = Number(source?.totalSalary ?? 0);
  const perHead = Number(source?.perHead ?? 0);

  return {
    contributionMode,
    contributionType: contributionMode,
    contributionAmount: Number.isFinite(contributionAmount) ? contributionAmount : 0,
    imamSalarySystem: 'EQUAL',
    totalMuqtadies: Number.isFinite(totalMuqtadies) ? totalMuqtadies : 0,
    totalSalary: Number.isFinite(totalSalary) ? totalSalary : 0,
    perHead: Number.isFinite(perHead) ? perHead : 0,
    settingsLocked: Boolean(source?.settingsLocked),
    settingsLockReason:
      typeof source?.settingsLockReason === 'string'
        ? source.settingsLockReason
        : null,
  };
}

function normalizeNextCycleInfo(input: unknown): NextCycleInfo {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return EMPTY_NEXT_CYCLE_INFO;
  }

  const source = input as Record<string, unknown>;
  const currentCycle = source.currentCycle && typeof source.currentCycle === 'object' && !Array.isArray(source.currentCycle)
    ? (source.currentCycle as Record<string, unknown>)
    : null;
  const nextCycle = source.nextCycle && typeof source.nextCycle === 'object' && !Array.isArray(source.nextCycle)
    ? (source.nextCycle as Record<string, unknown>)
    : null;
  const timeRemaining = source.timeRemaining && typeof source.timeRemaining === 'object'
    ? (source.timeRemaining as Record<string, unknown>)
    : {};

  const hasActiveCycle = Boolean(
    source.hasActiveCycle
    ?? (currentCycle && Number.isFinite(Number(currentCycle.month)) && Number.isFinite(Number(currentCycle.year))),
  );

  const month = Number(nextCycle?.month ?? 0);
  const year = Number(nextCycle?.year ?? 0);
  const startsAt = typeof nextCycle?.startsAt === 'string' && nextCycle.startsAt
    ? nextCycle.startsAt
    : null;

  return {
    hasActiveCycle,
    currentCycle: hasActiveCycle && currentCycle
      ? {
          month: Number.isFinite(Number(currentCycle.month)) ? Number(currentCycle.month) : null,
          year: Number.isFinite(Number(currentCycle.year)) ? Number(currentCycle.year) : null,
          createdAt: typeof currentCycle.createdAt === 'string' ? currentCycle.createdAt : null,
        }
      : null,
    nextCycle: hasActiveCycle && startsAt && Number.isFinite(month) && Number.isFinite(year)
      ? {
          month,
          year,
          startsAt,
        }
      : null,
    timeRemaining: {
      days: hasActiveCycle && nextCycle ? (Number.isFinite(Number(timeRemaining.days)) ? Number(timeRemaining.days) : 0) : 0,
      hours: hasActiveCycle && nextCycle ? (Number.isFinite(Number(timeRemaining.hours)) ? Number(timeRemaining.hours) : 0) : 0,
      minutes: hasActiveCycle && nextCycle ? (Number.isFinite(Number(timeRemaining.minutes)) ? Number(timeRemaining.minutes) : 0) : 0,
    },
    settings: normalizeSettings(source.settings),
    hasPendingSettings: Boolean(source.hasPendingSettings),
    settingsLocked: Boolean(source.settingsLocked),
    settingsLockReason:
      typeof source.settingsLockReason === 'string'
        ? source.settingsLockReason
        : null,
  };
}

export interface ImamSalaryCycle {
  id: string;
  month: number;
  year: number;
  salaryAmount: number;
  contributionMode?: ContributionMode;
  contributionType?: ContributionMode;
  contributionAmount?: number;
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
  creditAmount: number;
  remainingAmount: number;
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
  status: 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'FAILED';
  cycleId?: string | null;
  month?: number | null;
  year?: number | null;
  createdAt: string;
}

export type ImamFundLedgerTransactionType = 'COLLECTION' | 'PAYOUT' | 'ADJUSTMENT';

export interface ImamFundHistoryResponse {
  summary: {
    totalCollected: number;
    totalPaidOut: number;
    currentBalance: number;
  };
  monthly: Array<{
    month: number;
    year: number;
    collected: number;
    paidOut: number;
    balance: number;
  }>;
  transactions: Array<{
    id: string;
    type: ImamFundLedgerTransactionType;
    amount: number;
    status: string;
    createdAt: string;
    month: number;
    year: number;
    note: string | null;
  }>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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
    cycleId?: string | null;
    dueId?: string | null;
    amount: number;
    status: string;
    method: string;
    screenshotUrl?: string | null;
    utr?: string | null;
    createdAt: string;
    updatedAt?: string;
  }>;
}

export interface MuqtadiDetails {
  id: string;
  userId?: string | null;
  accountState?: MuqtadiAccountState;
  setupLinkExpiresAt?: string | null;
  setupLinkExpiresInMinutes?: number | null;
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
  phone: string;
  email?: string;
}

export interface EnableMuqtadiLoginResponse {
  muqtadiId: string;
  userId: string;
  email: string;
  phone?: string;
  resetLink: string;
  expiresInMinutes: number;
  accountState: MuqtadiAccountState;
  setupLinkExpiresAt?: string | null;
  setupLinkExpiresInMinutes?: number | null;
  message: string;
}

export interface MuqtadiResetLinkResponse {
  muqtadiId: string;
  userId: string;
  email: string;
  resetLink: string;
  expiresInMinutes: number;
  accountState: MuqtadiAccountState;
  setupLinkExpiresAt?: string | null;
  setupLinkExpiresInMinutes?: number | null;
  message: string;
}

export interface CreateMuqtadiAccountPayload {
  phone: string;
  password: string;
}

export interface CreateMuqtadiAccountResponse {
  muqtadiId: string;
  userId: string;
  email: string;
  phone?: string;
  message: string;
}

export interface CreateMuqtadiPayload {
  name: string;
  fatherName: string;
  householdMembers: number;
  memberNames: string[];
  dependents?: Array<{ name: string }>;
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

export interface UpdateMuqtadiPaymentPayload {
  muqtadiId?: string;
  cycleId?: string;
  amount?: number;
  method?: 'CASH' | 'UPI' | 'BANK';
  status?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reference?: string;
  utr?: string;
  screenshotUrl?: string;
}

export interface ImamFundSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  income?: number;
  expense?: number;
}

export interface InitiateMyPaymentPayload {
  cycleId: string;
  amount: number;
  method?: 'UPI' | 'BANK' | 'CASH';
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

export interface MuqtadiStatsResponse {
  totalHouseholds: number;
  totalMuqtadies: number;
  verified: number;
  pending: number;
}

export interface MuqtadiListResponse extends PaginatedResponse<Muqtadi> {
  pending: Muqtadi[];
  stats: MuqtadiListStats;
}

export type MuqtadiTrashResponse = PaginatedResponse<Muqtadi>;

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

  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isDeleted?: boolean;
    accountStatus?: 'all' | 'account' | 'offline';
    paymentStatus?: 'all' | 'paid' | 'partial' | 'unpaid' | 'proof_pending';
    verificationStatus?: 'all' | 'verified' | 'pending';
    cycleStatus?: 'all' | 'included' | 'not_included';
  }): Promise<MuqtadiListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.accountStatus && params.accountStatus !== 'all') query.append('accountStatus', params.accountStatus);
    if (params?.paymentStatus && params.paymentStatus !== 'all') query.append('paymentStatus', params.paymentStatus);
    if (params?.verificationStatus && params.verificationStatus !== 'all') query.append('verificationStatus', params.verificationStatus);
    if (params?.cycleStatus && params.cycleStatus !== 'all') query.append('cycleStatus', params.cycleStatus);
    if (params?.isDeleted !== undefined) query.append('isDeleted', String(params.isDeleted));

    const suffix = query.toString();
    const response = await api.get(`/muqtadis${suffix ? `?${suffix}` : ''}`);
    const responseBody = (response.data as Record<string, unknown> | Muqtadi[] | null) ?? null;
    const data = Array.isArray(response.data)
      ? (response.data as Muqtadi[])
      : Array.isArray((responseBody as Record<string, unknown> | null)?.data)
        ? ((responseBody as Record<string, unknown>).data as Muqtadi[])
        : Array.isArray(((responseBody as Record<string, unknown> | null)?.data as Record<string, unknown> | undefined)?.data)
          ? ((((responseBody as Record<string, unknown>).data as Record<string, unknown>).data) as Muqtadi[])
          : [];
    const body = (!Array.isArray(responseBody) && responseBody ? responseBody : null) as Record<string, unknown> | null;
    const nestedBody = (!Array.isArray(body?.data) && body?.data && typeof body.data === 'object')
      ? (body.data as Record<string, unknown>)
      : null;
    const meta = (body?.meta as Record<string, unknown> | undefined)
      ?? (nestedBody?.meta as Record<string, unknown> | undefined)
      ?? {};
    const pending = Array.isArray(body?.pending)
      ? (body.pending as Muqtadi[])
      : Array.isArray(nestedBody?.pending)
        ? (nestedBody?.pending as Muqtadi[])
        : [];
    const stats = (body?.stats as Record<string, unknown> | undefined)
      ?? (nestedBody?.stats as Record<string, unknown> | undefined)
      ?? {};
    return {
      data,
      total: Number(meta.total ?? data.length),
      page: Number(meta.page ?? 1),
      pageSize: Number(meta.limit ?? 20),
      totalPages: Number(meta.totalPages ?? 1),
      pending,
      stats: {
        verifiedHouseholds: Number(stats.verifiedHouseholds ?? 0),
        verifiedMuqtadies: Number(stats.verifiedMuqtadies ?? 0),
        pendingHouseholds: Number(stats.pendingHouseholds ?? 0),
        pendingMuqtadies: Number(stats.pendingMuqtadies ?? 0),
      },
    };
  },

  async getTrash(params?: { page?: number; limit?: number }): Promise<MuqtadiTrashResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const suffix = query.toString();
    const response = await api.get(`/muqtadis/trash${suffix ? `?${suffix}` : ''}`);
    const body = (response.data as Record<string, unknown> | null) ?? null;
    const data = Array.isArray(body?.data) ? (body.data as Muqtadi[]) : [];
    const meta = (body?.meta as Record<string, unknown> | undefined) ?? {};

    return {
      data,
      total: Number(meta.total ?? data.length),
      page: Number(meta.page ?? 1),
      pageSize: Number(meta.limit ?? 20),
      totalPages: Number(meta.totalPages ?? 1),
    };
  },

  async getStats(): Promise<MuqtadiStatsResponse> {
    const response = await api.get('/muqtadis/stats');
    const data = (response.data as Record<string, unknown> | null) ?? null;
    return {
      totalHouseholds: Number(data?.totalHouseholds ?? 0),
      totalMuqtadies: Number(data?.totalMuqtadies ?? 0),
      verified: Number(data?.verified ?? 0),
      pending: Number(data?.pending ?? 0),
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

  async getDetailPayments(id: string): Promise<MuqtadiDetails['payments']> {
    const detail = await this.getById(id);
    return Array.isArray(detail.payments) ? detail.payments : [];
  },

  async getDetailDues(id: string): Promise<MuqtadiDetails['dues']> {
    const detail = await this.getById(id);
    return Array.isArray(detail.dues) ? detail.dues : [];
  },

  async getDetailHistory(id: string): Promise<MuqtadiDetails['history']> {
    const detail = await this.getById(id);
    return Array.isArray(detail.history) ? detail.history : [];
  },

  async getSettings(): Promise<ImamSalarySettings> {
    const response = await api.get<ImamSalarySettings>('/muqtadis/settings');
    const payload = extractDataPayload(response.data);
    return normalizeSettings(payload ?? EMPTY_IMAM_SALARY_SETTINGS);
  },

  async getNextCycleInfo(): Promise<NextCycleInfo> {
    const response = await api.get<NextCycleInfo>('/muqtadis/next-cycle-info');
    const payload = extractDataPayload(response.data);
    return normalizeNextCycleInfo(payload);
  },

  async updateSettings(payload: UpdateImamSalarySettingsPayload): Promise<ImamSalarySettings> {
    const response = await api.post<ImamSalarySettings>('/muqtadis/settings', payload);
    const normalizedPayload = extractDataPayload(response.data);
    return normalizeSettings(normalizedPayload ?? EMPTY_IMAM_SALARY_SETTINGS);
  },

  async createSalaryMonth(payload: { month: number; year: number }): Promise<ImamSalaryCycle> {
    const response = await api.post<ImamSalaryCycle>('/salary/month', payload);
    return response.data;
  },

  async getSalaryMonths(): Promise<ImamSalaryCycle[]> {
    const response = await api.get<ImamSalaryCycle[]>('/salary/months');
    return Array.isArray(response.data) ? response.data : [];
  },

  async getSalarySummary(): Promise<{
    contributionMode: ContributionMode;
    contributionType: ContributionMode;
    contributionAmount: number;
    totalSalary: number;
    totalMuqtadies: number;
    registeredMuqtadies: number;
    perHead: number;
  }> {
    const response = await api.get('/salary/summary');
    const data = (response.data as Record<string, unknown> | null) ?? null;
    const contributionModeRaw = data?.contributionMode ?? data?.contributionType;
    const contributionMode: ContributionMode = contributionModeRaw === 'PERSON' ? 'PERSON' : 'HOUSEHOLD';
    const contributionAmount = Number(data?.contributionAmount ?? data?.totalSalary ?? 0);

    return {
      contributionMode,
      contributionType: contributionMode,
      contributionAmount: Number.isFinite(contributionAmount) ? contributionAmount : 0,
      totalSalary: Number(data?.totalSalary ?? 0),
      totalMuqtadies: Number(data?.totalMuqtadies ?? 0),
      registeredMuqtadies: Number(data?.registeredMuqtadies ?? 0),
      perHead: Number(data?.perHead ?? 0),
    };
  },

  async recordPayment(payload: RecordMuqtadiPaymentPayload): Promise<MuqtadiDue> {
    const response = await api.post<MuqtadiDue>('/muqtadis/payments', payload);
    return response.data;
  },

  async updatePayment(paymentId: string, payload: UpdateMuqtadiPaymentPayload) {
    const response = await api.patch(`/muqtadis/payments/${paymentId}`, payload);
    return response.data;
  },

  async deletePayment(paymentId: string): Promise<{ id: string; deleted: boolean }> {
    const response = await api.delete(`/muqtadis/payments/${paymentId}`);
    return response.data;
  },

  async getImamFundSummary(): Promise<ImamFundSummary> {
    const response = await api.get('/imam-fund/summary');
    const data = (response.data as Record<string, unknown> | null) ?? null;
    return {
      totalIncome: Number(data?.totalIncome ?? data?.income ?? 0),
      totalExpense: Number(data?.totalExpense ?? data?.expense ?? 0),
      balance: Number(data?.balance ?? 0),
      income: Number(data?.income ?? data?.totalIncome ?? 0),
      expense: Number(data?.expense ?? data?.totalExpense ?? 0),
    };
  },

  async getImamFundHistory(params?: {
    page?: number;
    limit?: number;
    month?: string;
    type?: ImamFundLedgerTransactionType | 'all';
  }): Promise<ImamFundHistoryResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.month && params.month.trim()) query.set('month', params.month.trim());
    if (params?.type && params.type !== 'all') query.set('type', params.type);

    const suffix = query.toString();
    const response = await api.get(`/imam-fund/history${suffix ? `?${suffix}` : ''}`);
    const data = (response.data as Partial<ImamFundHistoryResponse> | null) ?? null;

    return {
      summary: {
        totalCollected: Number(data?.summary?.totalCollected ?? 0),
        totalPaidOut: Number(data?.summary?.totalPaidOut ?? 0),
        currentBalance: Number(data?.summary?.currentBalance ?? 0),
      },
      monthly: Array.isArray(data?.monthly)
        ? data!.monthly!.map((row) => ({
            month: Number(row.month ?? 0),
            year: Number(row.year ?? 0),
            collected: Number(row.collected ?? 0),
            paidOut: Number(row.paidOut ?? 0),
            balance: Number(row.balance ?? 0),
          }))
        : [],
      transactions: Array.isArray(data?.transactions)
        ? data!.transactions!.map((row) => ({
            id: String(row.id ?? ''),
            type: (row.type ?? 'ADJUSTMENT') as ImamFundLedgerTransactionType,
            amount: Number(row.amount ?? 0),
            status: String(row.status ?? 'POSTED'),
            createdAt: String(row.createdAt ?? new Date(0).toISOString()),
            month: Number(row.month ?? 0),
            year: Number(row.year ?? 0),
            note: row.note ? String(row.note) : null,
          }))
        : [],
      page: Number(data?.page ?? 1),
      limit: Number(data?.limit ?? 20),
      total: Number(data?.total ?? 0),
      totalPages: Number(data?.totalPages ?? 1),
      hasNextPage: Boolean(data?.hasNextPage),
      hasPreviousPage: Boolean(data?.hasPreviousPage),
    };
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

  async generateResetPasswordLink(id: string): Promise<MuqtadiResetLinkResponse> {
    const response = await api.post<MuqtadiResetLinkResponse>(`/muqtadis/${id}/reset-password-link`);
    return response.data;
  },

  async createAccount(id: string, payload: CreateMuqtadiAccountPayload): Promise<CreateMuqtadiAccountResponse> {
    const response = await api.post<CreateMuqtadiAccountResponse>(`/muqtadis/${id}/create-account`, payload);
    return response.data;
  },

  async includeInCurrentCycle(id: string): Promise<{ included: boolean; alreadyIncluded: boolean; dueId: string }> {
    const response = await api.post<{ included: boolean; alreadyIncluded: boolean; dueId: string }>(`/muqtadis/${id}/include-in-cycle`);
    return response.data;
  },

  async removeFromCurrentCycle(id: string): Promise<{ removed: boolean; notFound: boolean; dueId?: string }> {
    const response = await api.post<{ removed: boolean; notFound: boolean; dueId?: string }>(`/muqtadis/${id}/remove-from-cycle`);
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
    status: 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
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
    const body = (response.data as Record<string, unknown> | null) ?? null;
    const data = Array.isArray(body?.data) ? (body.data as MuqtadiDue[]) : [];
    const meta = (body?.meta as Record<string, unknown> | undefined) ?? {};
    const summary = (body?.summary as Record<string, unknown> | undefined) ?? {};
    return {
      data,
      total: Number(meta.total ?? data.length),
      page: Number(meta.page ?? 1),
      pageSize: Number(meta.limit ?? 20),
      totalPages: Number(meta.totalPages ?? 1),
      summary: {
        totalDue: Number(summary.totalDue ?? 0),
        totalPaid: Number(summary.totalPaid ?? 0),
        outstandingAmount: Number(summary.outstandingAmount ?? 0),
      },
    };
  },

  async getMyProfile(): Promise<{
    id: string;
    name: string;
    fatherName: string;
    email?: string | null;
    whatsappNumber?: string | null;
    category?: string | null;
    phone?: string | null;
    notes?: string | null;
    householdMembers: number;
    memberNames?: string[];
    dependentNames?: string[];
    isVerified?: boolean;
    status: MuqtadiStatus;
    householdLocked: boolean;
  }> {
    const response = await api.get('/muqtadis/my/profile');
    return response.data;
  },

  async updateMyProfile(payload: {
    name?: string;
    fatherName?: string;
    phone?: string;
    whatsappNumber?: string;
    email?: string;
    dependentNames?: string[];
    notes?: string;
  }) {
    const response = await api.post('/muqtadis/my/profile', payload);
    return response.data;
  },
};
