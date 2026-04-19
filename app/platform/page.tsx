'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { platformAdminService, type PlatformMosqueRow } from '@/services/platform-admin.service';
import { getErrorMessage } from '@/src/utils/error';
import { queryKeys } from '@/lib/query-keys';
import { invalidatePlatformMosquesQueries } from '@/lib/money-cache';

export default function PlatformIndexPage() {
  const queryClient = useQueryClient();

  const mosquesQuery = useQuery({
    queryKey: queryKeys.platformHomeMosques,
    queryFn: async () => {
      const result = await platformAdminService.getMosques({ page: 1, limit: 10 });
      return result.data;
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (mosqueId: string) => platformAdminService.deleteMosque(mosqueId),
    onSuccess: async () => {
      await invalidatePlatformMosquesQueries(queryClient);
    },
  });

  const handleDelete = async (mosque: PlatformMosqueRow) => {
    try {
      await deleteMutation.mutateAsync(mosque.id);
      toast.success(`Mosque deleted: ${mosque.name}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete mosque'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Management"
        description="Manage mosques from one place"
      >
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/register">Create Mosque</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/platform/mosques">View All Mosques</Link>
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Recent Mosques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mosquesQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
            </div>
          ) : (mosquesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No mosques found. Create one to get started.</p>
          ) : (
            (mosquesQuery.data ?? []).map((mosque) => {
              const busy = deleteMutation.isPending && deleteMutation.variables === mosque.id;
              return (
                <div
                  key={mosque.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{mosque.name}</p>
                    <p className="text-xs text-muted-foreground">{mosque.adminEmail || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={mosque.isSuspended ? 'secondary' : 'default'}>
                      {mosque.isSuspended ? 'Suspended' : 'Active'}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/platform/mosques/${mosque.id}`}>Open</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() => handleDelete(mosque)}
                    >
                      {busy ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

