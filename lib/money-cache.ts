import type { QueryClient } from '@tanstack/react-query';

export async function invalidateMoneyQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['funds'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    queryClient.invalidateQueries({ queryKey: ['reports'] }),
    queryClient.invalidateQueries({ queryKey: ['muqtadi-dashboard'], exact: false }),
    queryClient.invalidateQueries({ queryKey: ['muqtadi-dues'], exact: false }),
  ]);
}
