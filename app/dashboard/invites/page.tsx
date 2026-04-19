'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { DataTable } from '@/components/dashboard/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { usePermission } from '@/hooks/usePermission';
import { membersService, type InviteRecord } from '@/services/members.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatDate, formatRole } from '@/src/utils/format';
import { Loader2, Mail, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const statusColors: Record<InviteRecord['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-slate-100 text-slate-700',
};

export default function InvitesPage() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin } = usePermission();
  const queryClient = useQueryClient();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, isSuperAdmin, router]);

  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  const invitesQuery = useQuery({
    queryKey: queryKeys.invites,
    queryFn: () => membersService.getInvites(),
    enabled: isAdmin || isSuperAdmin,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (invitesQuery.error) {
      toast.error(getErrorMessage(invitesQuery.error, 'Failed to load invitations'));
    }
  }, [invitesQuery.error]);

  const handleCancel = async (id: string) => {
    if (loadingId || invitesQuery.isLoading) return;
    setLoadingId(id);
    const previousInvites = queryClient.getQueryData<InviteRecord[]>(queryKeys.invites);
    queryClient.setQueryData<InviteRecord[]>(queryKeys.invites, (prev = []) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'CANCELLED' } : item)),
    );
    try {
      await membersService.cancelInvite(id);
      toast.success('Invitation cancelled');
      await queryClient.invalidateQueries({ queryKey: queryKeys.invites });
    } catch (error) {
      queryClient.setQueryData(queryKeys.invites, previousInvites);
      toast.error(getErrorMessage(error, 'Failed to cancel invitation'));
    } finally {
      setLoadingId(null);
      setCancelId(null);
    }
  };

  const handleResend = useCallback(async (id: string) => {
    if (loadingId || invitesQuery.isLoading) return;
    setLoadingId(id);
    const previousInvites = queryClient.getQueryData<InviteRecord[]>(queryKeys.invites);
    queryClient.setQueryData<InviteRecord[]>(queryKeys.invites, (prev = []) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    try {
      await membersService.resendInvite(id);
      toast.success('Invitation resent');
      await queryClient.invalidateQueries({ queryKey: queryKeys.invites });
    } catch (error) {
      queryClient.setQueryData(queryKeys.invites, previousInvites);
      toast.error(getErrorMessage(error, 'Failed to resend invitation'));
    } finally {
      setLoadingId(null);
    }
  }, [invitesQuery.isLoading, loadingId, queryClient]);

  const columns = useMemo(
    () => [
      {
        key: 'contact',
        header: 'Phone / Email',
        render: (invite: InviteRecord) => (
          <span className="font-medium text-foreground">{invite.phone || invite.email || '-'}</span>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (invite: InviteRecord) => (
          <span className="text-muted-foreground">{formatRole(invite.role.toLowerCase())}</span>
        ),
      },
      {
        key: 'invitedBy',
        header: 'Invited By',
        render: (invite: InviteRecord) => (
          <span className="text-muted-foreground">{invite.invitedBy ?? 'Unknown'}</span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (invite: InviteRecord) => (
          <Badge className={statusColors[invite.status]}>{invite.status}</Badge>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created At',
        render: (invite: InviteRecord) => (
          <span className="text-muted-foreground">{formatDate(invite.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'text-right',
        render: (invite: InviteRecord) => {
          const isBusy = loadingId === invite.id;
          const canCancel = invite.status === 'PENDING';
          const canResend = invite.status === 'PENDING' || invite.status === 'CANCELLED' || invite.status === 'EXPIRED';

          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canResend || isBusy}
                onClick={() => handleResend(invite.id)}
              >
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Resend
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!canCancel || isBusy}
                onClick={() => setCancelId(invite.id)}
              >
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Cancel
              </Button>
            </div>
          );
        },
      },
    ],
    [handleResend, loadingId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description="Manage sent invitations, cancel pending invites, and resend expired or cancelled invites"
      />

      <Card className="border-border">
        <CardContent className="pt-6">
          <DataTable<InviteRecord & Record<string, unknown>>
            columns={columns as any}
            data={(invitesQuery.data ?? []) as (InviteRecord & Record<string, unknown>)[]}
            isLoading={invitesQuery.isLoading}
            emptyMessage="No invitations found"
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(cancelId)}
        onOpenChange={(open) => {
          if (!open && !loadingId) {
            setCancelId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              The invite link will stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(loadingId)}>Keep Invite</AlertDialogCancel>
            <AlertDialogAction
              disabled={!cancelId || Boolean(loadingId)}
              onClick={(e) => {
                e.preventDefault();
                if (!cancelId) return;
                handleCancel(cancelId);
              }}
            >
              {loadingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


