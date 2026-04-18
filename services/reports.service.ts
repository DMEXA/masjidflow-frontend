import api from './api';
import type { AuditLog, PaginatedResponse } from '@/types';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  userId?: string;
  action?: string;
  entity?: string;
  startDate?: string;
  endDate?: string;
}

export interface MonthlyDataPoint {
  month: number;
  totalDonations: number;
  totalExpenses: number;
  net: number;
}

export interface MonthlyReportResponse {
  year: number;
  data: MonthlyDataPoint[];
}

export interface YearlyReportResponse {
  totalDonations: number;
  totalExpenses: number;
  net: number;
}

export const reportsService = {
  async getMonthlyReport(year?: number): Promise<MonthlyReportResponse> {
    const params = year ? `?year=${year}` : '';
    const response = await api.get<MonthlyReportResponse>(`/reports/monthly${params}`);
    return response.data;
  },

  async getYearlyReport(): Promise<YearlyReportResponse> {
    const response = await api.get<YearlyReportResponse>('/reports/yearly');
    return response.data;
  },

  async getAuditLogs(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get<PaginatedResponse<AuditLog>>(`/reports/audit-logs?${params.toString()}`);
    return response.data;
  },

  async exportReport(type: 'pdf' | 'csv', filters?: ReportFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const response = await api.get(`/reports/export/${type}?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
