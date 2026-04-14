export const muqtadiQueryPolicy = {
  dashboard: {
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  },
  dues: {
    staleTime: 20_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
  },
  profile: {
    staleTime: 60_000,
    gcTime: 20 * 60_000,
    refetchOnWindowFocus: true,
  },
  announcements: {
    staleTime: 45_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  },
  prayerTimes: {
    staleTime: 2 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 2 * 60_000,
  },
  notifications: {
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  },
} as const;
