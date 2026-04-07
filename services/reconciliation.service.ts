import api from './api';

export type ReconciliationReviewReason =
  | 'DUPLICATE_BANK_ENTRY'
  | 'INTENT_BELONGS_TO_ANOTHER_MOSQUE'
  | 'DUPLICATE_OR_INVALID_INTENT_ID'
  | 'ALREADY_VERIFIED'
  | 'STATUS_NOT_ELIGIBLE'
  | 'AMOUNT_MISMATCH'
  | 'STATUS_CHANGED';

export interface ReconciliationNeedsReviewRow {
  csvRowIndex: number;
  intentId: string;
  amount: number;
  date: string | null;
  note: string;
  reference: string;
  reason: ReconciliationReviewReason;
  reasonMessage?: string;
  donationId?: string;
  donationStatus?: 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  expectedAmount?: number;
}

export interface ReconciliationUploadResult {
  autoVerified: number;
  needsReview: number;
  unmatched: number;
  processedRows: number;
  needsReviewRows: ReconciliationNeedsReviewRow[];
}

export const reconciliationService = {
  async uploadCsv(file: File): Promise<ReconciliationUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ReconciliationUploadResult>('/reconciliation/upload', formData);
    return response.data;
  },
};
