import api from './api';

export interface PaymentSettings {
  id: string;
  mosqueId: string;
  upiId: string;
  upiName: string;
  adminWhatsappNumber?: string | null;
  phoneNumber?: string | null;
  bankAccountName?: string | null;
  bankAccount?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  paymentInstructions?: string | null;
  qrLogo?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPaymentSettingsData {
  upiId?: string;
  upiName?: string;
  adminWhatsappNumber?: string;
  phoneNumber?: string;
  bankAccountName?: string;
  bankAccount?: string;
  ifsc?: string;
  bankName?: string;
  paymentInstructions?: string;
  qrLogo?: string;
}

export const paymentSettingsService = {
  async get(): Promise<PaymentSettings | null> {
    const response = await api.get<PaymentSettings | null>('/payment-settings');
    return response.data;
  },

  async upsert(data: UpsertPaymentSettingsData): Promise<PaymentSettings> {
    const response = await api.put<PaymentSettings>('/payment-settings', data);
    return response.data;
  },
};
