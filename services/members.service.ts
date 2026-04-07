import api from './api';
import type { Member, PaginatedResponse } from '@/types';
import type { UserRole } from '@/src/constants';
import { DEFAULT_PAGE_LIMIT, getSafeLimit } from '@/src/utils/pagination';

type ApiRole = 'SUPER_ADMIN' | 'ADMIN' | 'TREASURER' | 'MEMBER' | 'MUQTADI' | 'VIEWER';

function toApiRole(role: UserRole): ApiRole {
  return role.toUpperCase() as ApiRole;
}

function fromApiRole(role: string): UserRole {
  return role.toLowerCase() as UserRole;
}

export interface InviteMemberData {
  email: string;
  isMuqtadi?: boolean;
  role: UserRole;
}

export interface CreateMemberData {
  email?: string;
  password?: string;
  name: string;
  fatherName?: string;
  isMuqtadi?: boolean;
  role: UserRole;
}

export interface InviteMemberResponse {
  id: string;
  email: string;
  role: ApiRole;
  token?: string;
  link?: string;
  inviteLink?: string;
  expiresAt: string;
  maxUses?: number | null;
  usedCount?: number;
  emailSent?: boolean;
}

export interface InviteLinkResponse {
  link: string;
}

export interface CreateInviteLinkPayload {
  maxUses?: number;
}

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';

export interface InviteRecord {
  id: string;
  email: string;
  role: ApiRole;
  invitedBy?: string | null;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
  maxUses?: number | null;
  usedCount?: number;
  acceptedAt?: string | null;
  cancelledAt?: string | null;
}

export interface MemberFilters {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  status?: 'active' | 'pending' | 'inactive';
  search?: string;
}

export const membersService = {
  async getAll(filters?: MemberFilters): Promise<PaginatedResponse<Member>> {
    const params = new URLSearchParams();
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const limit = getSafeLimit(filters?.pageSize, DEFAULT_PAGE_LIMIT);

    params.append('page', String(page));
    params.append('limit', String(limit));

    if (filters?.role) {
      params.append('role', String(filters.role));
    }

    if (filters?.status) {
      params.append('status', String(filters.status));
    }

    if (filters?.search) {
      params.append('search', String(filters.search));
    }

    const response = await api.get(`/members?${params.toString()}`);
    const { data, meta } = response.data;
    return {
      data: data.map((item: any) => ({
        id: item.id,
        mosqueId: item.mosqueId,
        userId: item.userId,
        name: item.user?.name ?? '',
        fatherName: item.user?.fatherName ?? null,
        isMuqtadi: item.role === 'MUQTADI' || Boolean(item.user?.muqtadiProfile),
        email: item.user?.email ?? '',
        role: fromApiRole(item.role),
        status: 'active' as const,
        joinedAt: item.createdAt,
      })),
      total: meta.total,
      page: meta.page,
      pageSize: meta.limit,
      totalPages: meta.totalPages,
    };
  },

  async getById(id: string): Promise<Member> {
    const response = await api.get<Member>(`/members/${id}`);
    return response.data;
  },

  async invite(data: InviteMemberData): Promise<InviteMemberResponse> {
    const payload = { ...data, role: toApiRole(data.role) };
    const response = await api.post<InviteMemberResponse>('/members/invite', payload);
    return response.data;
  },

  async create(data: CreateMemberData): Promise<Member> {
    const payload = { ...data, role: toApiRole(data.role) };
    const response = await api.post<Member>('/members', payload);
    return response.data;
  },

  async createInviteLink(payload?: CreateInviteLinkPayload): Promise<InviteLinkResponse> {
    const response = await api.post<InviteLinkResponse>('/members/invite-link', payload ?? {});
    return response.data;
  },

  async updateRole(memberId: string, role: UserRole): Promise<Member> {
    const response = await api.patch<Member>('/members/role', { memberId, role: toApiRole(role) });
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/members/${id}`);
  },

  async resendInvite(id: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/members/invites/${id}/resend`);
    return response.data;
  },

  async acceptInvite(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/members/accept-invite', { token, password });
    return response.data;
  },

  async getInvites(): Promise<InviteRecord[]> {
    const response = await api.get<InviteRecord[]>('/members/invites', {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    return response.data;
  },

  async cancelInvite(id: string): Promise<void> {
    await api.patch(`/members/invites/${id}/cancel`);
  },
};
