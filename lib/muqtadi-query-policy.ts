export const muqtadiQueryPolicy = {
  dashboard: {
    staleTime: 45_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
  },
  dues: {
    staleTime: 20_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 90_000,
  },
  profile: {
    staleTime: 5 * 60_000,
    gcTime: 20 * 60_000,
    refetchOnWindowFocus: false,
  },
  announcements: {
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 120_000,
  },
  prayerTimes: {
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60_000,
  },
  notifications: {
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  },
} as const;
