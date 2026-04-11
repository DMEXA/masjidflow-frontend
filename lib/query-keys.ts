export const queryKeys = {
  mosqueSettings: (mosqueId: string) => ['mosque-settings', mosqueId] as const,
  prayerTimes: (mosqueId: string) => ['prayer-times', mosqueId] as const,
  announcements: ['announcements'] as const,
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
  funds: (_mosqueId?: string) => ['funds'] as const,
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
  platformMosques: (filters: { page: number; limit: number; search: string; status: string }) =>
    ['platform-mosques', 'platform', filters] as const,
  platformPayments: (filters: { page: number; limit: number; mosqueId: string; status: string }) =>
    ['platform-payments', 'platform', filters] as const,
  platformSubscriptions: (filters: { page: number; limit: number; status: string }) =>
    ['platform-subscriptions', 'platform', filters] as const,
  muqtadiDues: (userId?: string) => ['muqtadi-dues', userId ?? 'none'] as const,
  dashboardOverview: (mosqueId?: string) => ['dashboard-overview', mosqueId ?? 'none'] as const,
  muqtadiDashboard: (mosqueId?: string) => ['muqtadi-dashboard', mosqueId ?? 'none'] as const,
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
