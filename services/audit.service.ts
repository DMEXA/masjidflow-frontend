import api from './api';
import type { AuditLog, PaginatedResponse } from '@/types';
import { EXPORT_MAX_ROWS } from '@/src/utils/export';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  fund?: string;
  userId?: string;
  paymentType?: string;
  dateRange?: 'today' | 'week' | 'month' | 'custom';
  from?: string;
  to?: string;
}

function mapLog(item: any): AuditLog {
  return {
    id: item.id,
    mosqueId: item.mosqueId,
    userId: item.userId,
    userName: item.userName ?? item.user?.name ?? 'System',
    action: item.action,
    entity: item.entity,
    entityId: item.entityId ?? undefined,
    entityLabel: item.entityLabel ?? undefined,
    details: item.details ?? undefined,
    ipAddress: item.ipAddress ?? undefined,
    timestamp: item.createdAt,
  };
}

function buildParams(filters?: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (!filters) return '';
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params.append(key, String(value));
    }
  });
  return params.toString() ? `?${params.toString()}` : '';
}

function withExportCap(filters?: AuditLogFilters): AuditLogFilters {
  return {
    ...filters,
    page: 1,
    limit: Math.min(filters?.limit ?? EXPORT_MAX_ROWS, EXPORT_MAX_ROWS),
  };
}

export const auditService = {
  async getAll(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const response = await api.get(`/audit${buildParams(filters)}`);
    const { data, meta } = response.data;
    return {
      data: data.map(mapLog),
      total: meta.total,
      page: meta.page,
      pageSize: meta.limit,
      totalPages: meta.totalPages,
    };
  },

  exportCsvUrl(filters?: AuditLogFilters): string {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');
    return `${base}/audit/export/csv${buildParams(filters)}`;
  },

  exportPdfUrl(filters?: AuditLogFilters): string {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');
    return `${base}/audit/export/pdf${buildParams(filters)}`;
  },

  async downloadCsv(filters?: AuditLogFilters): Promise<void> {
    const response = await api.get(`/audit/export/csv${buildParams(withExportCap(filters))}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-log-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  async downloadPdf(filters?: AuditLogFilters): Promise<void> {
    try {
      const response = await api.get(`/audit/export/pdf${buildParams(withExportCap(filters))}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      throw error;
    }
  },
};

