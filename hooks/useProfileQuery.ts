import { useQuery, useQueryClient } from '@tanstack/react-query';
import { muqtadisService } from '@/services/muqtadis.service';
import { useAuthStore } from '@/src/store/auth.store';
import { queryKeys } from '@/lib/query-keys';
import { muqtadiQueryPolicy } from '@/lib/muqtadi-query-policy';

export function useProfileQuery(enabled = true) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const profileKey = queryKeys.muqtadiProfile(user?.id);

  return useQuery({
    queryKey: profileKey,
    queryFn: () => muqtadisService.getMyProfile(),
    enabled,
    staleTime: muqtadiQueryPolicy.profile.staleTime,
    gcTime: muqtadiQueryPolicy.profile.gcTime,
    refetchOnWindowFocus: muqtadiQueryPolicy.profile.refetchOnWindowFocus,
    refetchOnReconnect: true,
    placeholderData: (previous) => previous ?? queryClient.getQueryData(profileKey),
    retry: 1,
  });
}

