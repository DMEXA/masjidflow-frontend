import api from './api';

export interface Subscription {
  id: string;
  mosqueId: string;
  plan: 'TRIAL' | 'PREMIUM' | 'ADVANCED_PREMIUM';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  startDate: string;
  endDate: string | null;
  price: number | null;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionDurationCode = 'SUBSCRIPTION_1M' | 'SUBSCRIPTION_6M' | 'SUBSCRIPTION_12M';

export interface SubscriptionPlanOption {
  id: string;
  name: string;
  code: string;
  price: number;
  durationDays: number;
  isActive: boolean;
}

export interface SubscriptionPaymentSettings {
  upiId: string;
  upiName: string;
  basePrice?: number;
  price1Month?: number;
  price6Months?: number;
  price12Months?: number;
  bankAccount?: string;
  ifsc?: string;
  bankName?: string;
  updatedAt: string;
}

export interface SubscriptionPaymentRequest {
  id: string;
  amount: number;
  duration: number;
  intentId: string;
  status: 'PENDING' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
  proofUrl?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
}

export const subscriptionsService = {
  async getCurrent(): Promise<Subscription | null> {
    const response = await api.get<Subscription>('/subscriptions');
    return response.data ?? null;
  },

  async upgrade(plan: 'PREMIUM' | 'ADVANCED_PREMIUM'): Promise<Subscription> {
    const response = await api.post<Subscription>('/subscriptions/upgrade', { plan });
    return response.data;
  },

  async getPlans(): Promise<SubscriptionPlanOption[]> {
    const response = await api.get<SubscriptionPlanOption[]>('/subscriptions/plans');
    return response.data;
  },

  async getPaymentSettings(): Promise<SubscriptionPaymentSettings | null> {
    const response = await api.get<SubscriptionPaymentSettings | null>('/subscriptions/payment-settings');
    return response.data;
  },

  async getPayments(): Promise<SubscriptionPaymentRequest[]> {
    const response = await api.get<SubscriptionPaymentRequest[]>('/subscriptions/payments');
    return response.data;
  },

  async initiatePayment(planCode: SubscriptionDurationCode): Promise<SubscriptionPaymentRequest & { paymentSettings: SubscriptionPaymentSettings | null }> {
    const response = await api.post<SubscriptionPaymentRequest & { paymentSettings: SubscriptionPaymentSettings | null }>(
      '/subscriptions/payments/initiate',
      { planCode },
    );
    return response.data;
  },

  async uploadProofScreenshot(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('screenshot', file);
    const response = await api.post<{ url: string }>('/subscriptions/payments/upload-screenshot', formData);
    return response.data;
  },

  async submitProof(payload: { intentId?: string; proofUrl?: string; note?: string }): Promise<SubscriptionPaymentRequest> {
    const response = await api.post<SubscriptionPaymentRequest>('/subscriptions/payments/proof', {
      intentId: payload.intentId,
      proofUrl: payload.proofUrl,
      note: payload.note,
    });
    return response.data;
  },
};
