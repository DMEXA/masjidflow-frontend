import { useQuery } from '@tanstack/react-query';
import { muqtadisService } from '@/services/muqtadis.service';

export function useProfileQuery() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => muqtadisService.getMyProfile(),
    staleTime: 30_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

