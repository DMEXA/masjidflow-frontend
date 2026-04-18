'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import { usePermission } from '@/hooks/usePermission';
import { formatDate, formatRole } from '@/src/utils/format';
import { USER_ROLES } from '@/src/constants';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { membersService, type InviteRecord } from '@/services/members.service';
import { getErrorMessage, isTransientServiceError } from '@/src/utils/error';
import type { Member } from '@/types';
import type { UserRole } from '@/src/constants';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSafeLimit } from '@/src/utils/pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { keepPreviousData } from '@tanstack/react-query';

type MemberRow = {
  id: string;
  memberType: 'offline' | 'account';
  name: string;
  fatherName?: string | null;
  isMuqtadi?: boolean;
  phone?: string | null;
  email: string;
  role: UserRole;
  createdAt: string;
};

type InviteRow = {
  id: string;
  name: string;
  contact: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  status: InviteRecord['status'];
  createdAt: string;
  expiresAt: string;
  usedCount: number;
  maxUses: number | null;
};

const roleOptions: UserRole[] = [
  USER_ROLES.ADMIN,
  USER_ROLES.TREASURER,
  USER_ROLES.VIEWER,
  USER_ROLES.MUQTADI,
  USER_ROLES.MEMBER,
];

function mapInviteRole(role: InviteRecord['role']): UserRole {
  return role.toLowerCase() as UserRole;
}

function buildInviteDisplayName(email?: string | null): string {
  if (!email) {
    return 'Invited Member';
  }

  const local = email.split('@')[0] ?? 'Invited Member';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Invited Member';
}

function getInviteStatusDisplay(status: InviteRecord['status']): { label: string; className: string } {
  if (status === 'PENDING') {
    return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
  }
  if (status === 'ACCEPTED') {
    return { label: 'Used', className: 'bg-emerald-100 text-emerald-800' };
  }
  if (status === 'EXPIRED') {
    return { label: 'Expired', className: 'bg-orange-100 text-orange-800' };
  }
  return { label: 'Cancelled', className: 'bg-slate-100 text-slate-700' };
}

export default function MembersPage() {
  const router = useRouter();
  const { canManageMembers, isSuperAdmin } = usePermission();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!canManageMembers) {
      router.replace('/dashboard');
    }
  }, [canManageMembers, router]);

  if (!canManageMembers) {
    return null;
  }

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ memberId: string; nextRole: UserRole } | null>(null);
  const [memberToRemoveId, setMemberToRemoveId] = useState<string | null>(null);
  const pageLimit = getSafeLimit(20);

  const membersFilters = {
    search: debouncedSearch.trim(),
    role: roleFilter,
    status: 'all',
  };
  const membersQueryKey = queryKeys.members({ page, limit: pageLimit, filters: membersFilters });
  const invitesQueryKey = queryKeys.invites;

  const membersQuery = useQuery({
    queryKey: membersQueryKey,
    queryFn: () => membersService.getAll({ page, pageSize: pageLimit }),
    enabled: canManageMembers,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (failureCount, error) => isTransientServiceError(error) && failureCount < 2,
  });

  const invitesQuery = useQuery({
    queryKey: invitesQueryKey,
    queryFn: () => membersService.getInvites(),
    enabled: canManageMembers,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (failureCount, error) => isTransientServiceError(error) && failureCount < 2,
  });

  useEffect(() => {
    if (membersQuery.error || invitesQuery.error) {
      toast.error(getErrorMessage(membersQuery.error ?? invitesQuery.error, 'Failed to load members'));
    }
  }, [invitesQuery.error, membersQuery.error]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const membersData = useMemo(() => (membersQuery.data?.data ?? []) as Member[], [membersQuery.data?.data]);
  const invitesData = useMemo(() => invitesQuery.data ?? [], [invitesQuery.data]);

  const filteredMembers: MemberRow[] = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return membersData
      .map((member) => ({
        id: member.id,
        memberType: member.userId ? ('account' as const) : ('offline' as const),
        name: member.name,
        fatherName: member.fatherName ?? null,
        isMuqtadi: Boolean(member.isMuqtadi),
        phone: member.phone ?? null,
        email: member.email,
        role: member.role,
        createdAt: member.joinedAt,
      }))
      .filter((member) => {
        const matchesSearch =
          normalizedQuery.length === 0 ||
          member.name.toLowerCase().includes(normalizedQuery) ||
          (member.phone ?? '').toLowerCase().includes(normalizedQuery) ||
          member.email.toLowerCase().includes(normalizedQuery);
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;
        return matchesSearch && matchesRole;
      });
  }, [membersData, debouncedSearch, roleFilter]);

  const inviteRows: InviteRow[] = useMemo(() => {
    const normalizedQuery = debouncedSearch.trim().toLowerCase();

    return invitesData
      .map((invite) => {
        const contact = invite.phone || invite.email || 'Unknown contact';
        return {
          id: invite.id,
          name: buildInviteDisplayName(invite.email),
          contact,
          email: invite.email,
          phone: invite.phone,
          role: mapInviteRole(invite.role),
          status: invite.status,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
          usedCount: invite.usedCount ?? 0,
          maxUses: invite.maxUses ?? null,
        };
      })
      .filter((invite) => {
        const matchesSearch =
          normalizedQuery.length === 0 ||
          invite.name.toLowerCase().includes(normalizedQuery) ||
          invite.contact.toLowerCase().includes(normalizedQuery);
        const matchesRole = roleFilter === 'all' || invite.role === roleFilter;
        return matchesSearch && matchesRole;
      });
  }, [invitesData, debouncedSearch, roleFilter]);

  const assignableRoleOptions = useMemo(
    () => roleOptions.filter((role) => isSuperAdmin || role !== USER_ROLES.ADMIN),
    [isSuperAdmin],
  );

  const handleRoleChange = async (memberId: string, nextRole: UserRole) => {
    setActionId(`role:${memberId}`);
    try {
      await membersService.updateRole(memberId, nextRole);
      toast.success('Role updated successfully');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: membersQueryKey }),
        queryClient.invalidateQueries({ queryKey: invitesQueryKey }),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update role'));
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (actionId) return;
    setActionId(`remove:${memberId}`);
    const snapshot = queryClient.getQueryData(membersQueryKey);
    queryClient.setQueryData(membersQueryKey, (prev: any) => {
      if (!prev || !Array.isArray(prev.data)) return prev;
      const nextData = prev.data.filter((member: Member) => member.id !== memberId);
      const nextTotal = Math.max(0, Number(prev.total ?? nextData.length) - 1);
      const pageSize = Number(prev.pageSize ?? pageLimit) || pageLimit;
      return {
        ...prev,
        data: nextData,
        total: nextTotal,
        totalPages: Math.max(1, Math.ceil(nextTotal / pageSize)),
      };
    });
    try {
      await membersService.remove(memberId);
      toast.success('Member removed successfully');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: membersQueryKey }),
        queryClient.invalidateQueries({ queryKey: invitesQueryKey }),
      ]);
    } catch (error) {
      if (snapshot) {
        queryClient.setQueryData(membersQueryKey, snapshot);
      }
      toast.error(getErrorMessage(error, 'Failed to remove member'));
    } finally {
      setActionId(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setActionId(`invite:${inviteId}`);
    try {
      await membersService.resendInvite(inviteId);
      toast.success('Invite resent successfully');
      await queryClient.invalidateQueries({ queryKey: invitesQueryKey });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to resend invite'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="ds-stack">
      <PageHeader
        title="Members"
        description="Manage mosque team access and pending invitations"
      >
        <div className="ds-stack">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/members/invite">Invite Member</Link>
          </Button>
        </div>
        </div>
      </PageHeader>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="ds-stack">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="button" variant="secondary" onClick={() => setIsFiltersOpen(true)}>
              Filters
            </Button>
          </div>

          {(membersQuery.isLoading || invitesQuery.isLoading) ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
            </div>
          ) : filteredMembers.length === 0 && inviteRows.length === 0 ? (
            <div className="rounded-xl border-0 p-0">
              <ListEmptyState
                title="No members yet"
                description="Invite your team to start collaborating."
                actionLabel="Invite Member"
                actionHref="/dashboard/members/invite"
              />
            </div>
          ) : (
            <>
              <div className="ds-stack">
                {filteredMembers.map((row) => (
                  <div key={row.id} className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-foreground">{row.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {row.memberType === 'offline' ? 'Offline Member' : 'Account Member'}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {row.phone || row.email || 'No contact available'}
                      </p>
                      {row.email ? (
                        <p className="text-xs text-muted-foreground">
                          Email: {row.email}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {row.fatherName && row.fatherName !== 'N/A' ? `S/O ${row.fatherName}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Muqtadi: {row.isMuqtadi ? 'Yes' : 'No'}
                      </p>

                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <p className='bg-emerald-500 rounded-2xl px-2 py-1 text-white'>{formatRole(row.role)}</p>
                        {/* <p>{formatDate(row.createdAt)}</p> this represents created at about the staff */}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {row.email ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`mailto:${row.email}`}>View</Link>
                          </Button>
                        ) : null}
                        <ActionOverflowMenu
                          items={[
                            ...assignableRoleOptions
                              .filter((role) => role !== row.role)
                              .map((role) => ({
                                label: `Set role: ${formatRole(role)}`,
                                onSelect: () => setPendingRoleChange({ memberId: row.id, nextRole: role }),
                              })),
                            ...(row.role !== USER_ROLES.SUPER_ADMIN
                              ? [{ label: actionId === `remove:${row.id}` ? 'Removing...' : 'Remove', onSelect: () => setMemberToRemoveId(row.id), destructive: true }]
                              : []),
                          ]}
                        />
                      </div>
                  </div>
                ))}
              </div>

              {inviteRows.length > 0 ? (
                <div className="ds-stack pt-2">
                  <p className="text-sm font-semibold text-foreground">Invites</p>
                  {inviteRows.map((invite) => (
                    <div key={invite.id} className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-foreground">{invite.name}</p>
                        <Badge className={getInviteStatusDisplay(invite.status).className}>
                          {getInviteStatusDisplay(invite.status).label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{invite.contact}</p>
                      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                        <p className="bg-emerald-500 rounded-2xl px-2 py-1 text-white">{formatRole(invite.role)}</p>
                        <p>{formatDate(invite.createdAt)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uses: {invite.usedCount}/{invite.maxUses ?? '∞'} · Expires: {formatDate(invite.expiresAt)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {invite.email ? (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`mailto:${invite.email}`}>View</Link>
                          </Button>
                        ) : null}
                        <ActionOverflowMenu
                          items={[
                            {
                              label: actionId === `invite:${invite.id}` ? 'Resending...' : 'Resend Invite',
                              onSelect: () => handleResendInvite(invite.id),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {membersQuery.data?.totalPages || 1}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    disabled={page <= 1 || membersQuery.isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(current + 1, membersQuery.data?.totalPages || 1))}
                    disabled={page >= (membersQuery.data?.totalPages || 1) || membersQuery.isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-4 ds-stack">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {formatRole(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRoleFilter('all');
                setIsFiltersOpen(false);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(pendingRoleChange)} onOpenChange={(open) => !open && setPendingRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the member role and permissions immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingRoleChange) return;
                handleRoleChange(pendingRoleChange.memberId, pendingRoleChange.nextRole);
                setPendingRoleChange(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(memberToRemoveId)} onOpenChange={(open) => !open && setMemberToRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this member?</AlertDialogTitle>
            <AlertDialogDescription>
              This member will be removed from the mosque.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!memberToRemoveId) return;
                handleRemove(memberToRemoveId);
                setMemberToRemoveId(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
