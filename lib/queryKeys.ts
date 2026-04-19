export const queryKeys = {
  dashboard: ['dashboard'] as const,
  reports: ['reports'] as const,
  mosqueProfile: (mosqueId?: string) => ['mosque', mosqueId ?? 'none'] as const,
  paymentSettings: (mosqueId?: string) => ['payment-settings', mosqueId ?? 'none'] as const,
  muqtadiNextCycleInfo: ['muqtadi-next-cycle-info'] as const,
  mosqueSettings: (mosqueId: string) => ['mosque-settings', mosqueId] as const,
  prayerTimes: (mosqueId: string) => ['prayer-times', mosqueId] as const,
  announcements: ['announcements'] as const,
  announcementsByMosque: (mosqueId?: string) => ['announcements', mosqueId ?? 'none'] as const,
  membersRoot: ['members'] as const,
  members: (params: {
    page: number;
    limit: number;
    filters: {
      search: string;
      role: string;
      status: string;
    };
  }) => ['members', params] as const,
  invites: ['invites'] as const,
  funds: (mosqueId?: string) => ['funds', mosqueId ?? 'none'] as const,
  inactiveFunds: (mosqueId?: string) => ['inactive-funds', mosqueId ?? 'none'] as const,
  fundDetail: (fundId?: string) => ['fund', fundId ?? 'none'] as const,
  donationsRoot: (mosqueId?: string) => ['donations', mosqueId ?? 'none'] as const,
  donations: (
    mosqueId: string | undefined,
    filters: {
      page: number;
      limit: number;
      status: string;
      paymentType: string;
      fundType: string;
      search: string;
    },
  ) => ['donations', mosqueId ?? 'none', filters] as const,
  donationsPendingCount: (mosqueId?: string) => ['pending-count', mosqueId ?? 'none'] as const,
  expensesRoot: (mosqueId?: string) => ['expenses', mosqueId ?? 'none'] as const,
  expenses: (
    mosqueId: string | undefined,
    filters: {
      page: number;
      pageSize: number;
      status: string;
      category: string;
      fundType: string;
      search: string;
    },
  ) => ['expenses', mosqueId ?? 'none', filters] as const,
  expensesPendingCount: (mosqueId?: string) => ['expenses-pending-count', mosqueId ?? 'none'] as const,
  muqtadis: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    accountStatus?: 'all' | 'account' | 'offline';
    paymentStatus?: 'all' | 'paid' | 'partial' | 'unpaid' | 'proof_pending';
    verificationStatus?: 'all' | 'verified' | 'pending';
    cycleStatus?: 'all' | 'included' | 'not_included';
  }) =>
    ['muqtadis', params ?? {
      page: 1,
      limit: 20,
      search: '',
      accountStatus: 'all',
      paymentStatus: 'all',
      verificationStatus: 'all',
      cycleStatus: 'all',
    }] as const,
  muqtadiDetail: (muqtadiId?: string) => ['muqtadi-detail', muqtadiId ?? 'none'] as const,
  muqtadiDetailDues: (muqtadiId?: string) => ['muqtadi-detail-dues', muqtadiId ?? 'none'] as const,
  muqtadiPayments: (muqtadiId?: string) => ['muqtadi-payments', muqtadiId ?? 'none'] as const,
  muqtadiHistory: (muqtadiId?: string) => ['muqtadi-history', muqtadiId ?? 'none'] as const,
  platformMosques: (filters: { page: number; limit: number; search: string; status: string }) =>
    ['platform-mosques', 'platform', filters] as const,
  platformMosquesRoot: ['platform-mosques', 'platform'] as const,
  platformPayments: (filters: { page: number; limit: number; mosqueId: string; status: string }) =>
    ['platform-payments', 'platform', filters] as const,
  platformPaymentsRoot: ['platform-payments', 'platform'] as const,
  platformHomeMosques: ['platform-home-mosques'] as const,
  platformSubscriptions: (filters: { page: number; limit: number; status: string }) =>
    ['platform-subscriptions', 'platform', filters] as const,
  muqtadiDues: (userId?: string) => ['muqtadi-dues', userId ?? 'none'] as const,
  muqtadiProfile: (userId?: string) => ['muqtadi-profile', userId ?? 'none'] as const,
  notifications: (userId?: string) => ['notifications', userId ?? 'none'] as const,
  dashboardOverview: (mosqueId?: string) => ['dashboard-overview', mosqueId ?? 'none'] as const,
  muqtadiDashboard: (mosqueId?: string) => ['muqtadi-dashboard', mosqueId ?? 'none'] as const,
  publicDonateSlug: (mosqueSlug?: string) => ['public-donate-slug', mosqueSlug ?? 'none'] as const,
  publicDonateConfig: (mosqueId?: string) => ['public-donate-config', mosqueId ?? 'none'] as const,
  publicDonateFunds: (mosqueId?: string) => ['public-donate-funds', mosqueId ?? 'none'] as const,
  imamFundHistory: (
    mosqueId: string | undefined,
    filters: {
      page: number;
      limit: number;
      month: string;
      type: string;
    },
  ) => ['imam-fund-history', mosqueId ?? 'none', filters] as const,
};