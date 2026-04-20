import api from './api';
import type { Expense, PaginatedResponse } from '@/types';
import type { ExpenseCategory } from '@/src/constants';
import { DEFAULT_PAGE_LIMIT, getSafeLimit } from '@/src/utils/pagination';
import { prepareProofUploadFile, type UploadStage } from '@/utils/compressImage';

export interface CreateExpenseData {
  category: ExpenseCategory | string;
  amount: number;
  description: string;
  receipt?: string;
  vendor?: string;
  fundId?: string;
}

export interface ExpenseFilters {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  category?: ExpenseCategory | string;
  search?: string;
  fundId?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const expensesService = {
  async getAll(filters?: ExpenseFilters): Promise<PaginatedResponse<Expense>> {
    const params = new URLSearchParams();
    const safeLimit = getSafeLimit(filters?.pageSize, DEFAULT_PAGE_LIMIT);
    if (filters) {
      if (filters.page) params.append('page', String(filters.page));
      params.append('limit', String(safeLimit));
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.fundId) params.append('fundId', filters.fundId);
      if (filters.status) params.append('status', filters.status);
    } else {
      params.append('limit', String(safeLimit));
    }

    const response = await api.get(`/expenses?${params.toString()}`);
    const body = response.data;
    return {
      data: body.data,
      total: body.meta?.total ?? 0,
      page: body.meta?.page ?? 1,
      pageSize: body.meta?.limit ?? 20,
      totalPages: body.meta?.totalPages ?? 1,
    };
  },

  async getById(id: string): Promise<Expense> {
    const response = await api.get<Expense>(`/expenses/${id}`);
    return response.data;
  },

  async create(data: CreateExpenseData): Promise<Expense> {
    const response = await api.post<Expense>('/expenses', {
      amount: String(data.amount),
      description: data.description,
      category: data.category,
      ...(data.receipt ? { receipt: data.receipt } : {}),
      ...(data.fundId ? { fundId: data.fundId } : {}),
    });
    return response.data;
  },

  async update(id: string, data: Partial<CreateExpenseData>): Promise<Expense> {
    const payload: Record<string, unknown> = {};
    if (data.amount !== undefined) payload.amount = String(data.amount);
    if (data.description !== undefined) payload.description = data.description;
    if (data.category !== undefined) payload.category = data.category;
    if (data.receipt !== undefined) payload.receipt = data.receipt;
    if (data.fundId !== undefined) payload.fundId = data.fundId;
    const response = await api.patch<Expense>(`/expenses/${id}`, payload);
    return response.data;
  },

  async approve(id: string): Promise<Expense> {
    const response = await api.patch<Expense>(`/expenses/${id}/approve`);
    return response.data;
  },

  async reject(id: string): Promise<Expense> {
    const response = await api.patch<Expense>(`/expenses/${id}/reject`);
    return response.data;
  },

  async getPendingCount(): Promise<{ count: number }> {
    const response = await api.get<{ count: number }>('/expenses/pending-count');
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.patch(`/expenses/${id}`, { softDelete: true });
  },

  async getTrash(): Promise<Expense[]> {
    const response = await api.get<Expense[]>('/expenses/trash');
    return response.data;
  },

  async restore(id: string): Promise<void> {
    await api.patch(`/expenses/${id}/restore`);
  },

  async permanentDelete(id: string): Promise<void> {
    await api.delete(`/expenses/${id}/permanent`);
  },

  async getStats(): Promise<{
    totalThisMonth: number;
    totalLastMonth: number;
    trend: number;
    byCategory: Record<ExpenseCategory, number>;
  }> {
    const response = await api.get('/expenses/stats');
    return response.data;
  },

  async uploadReceipt(
    file: File,
    onStageChange?: (stage: UploadStage) => void,
  ): Promise<{ url: string }> {
    const compressedFile = await prepareProofUploadFile(file, { onStageChange });
    onStageChange?.('uploading');
    const formData = new FormData();
    formData.append('receipt', compressedFile, compressedFile.name);
    const response = await api.post<{ url: string }>('/expenses/upload-receipt', formData);
    return response.data;
  },
};
