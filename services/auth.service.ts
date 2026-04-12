import api from './api';
import type { AuthResponse, User, Mosque } from '@/types';
import {
  clearRefreshTokenAvailable,
  clearTwoFactorPending,
  markRefreshTokenAvailable,
} from '@/services/auth-session';
import { clearAccessToken, getAccessToken, setAccessToken } from './access-token';

export interface RegisterResponse {
  accessToken?: string;
  user?: AuthResponse['user'] | null;
  mosque?: AuthResponse['mosque'];
  role?: string;
  message?: string;
  requiresEmailVerification?: boolean;
  emailDeliveryFailed?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginEmailOtpResponse {
  requiresEmailOtp: true;
  challengeToken: string;
}

export interface LoginTotpResponse {
  requiresTotp: true;
  challengeToken: string;
}

export interface LoginTwoFactorSetupResponse {
  requires2FASetup: true;
  userId: string;
  setupToken: string;
}

export interface LoginTwoFactorRequiredResponse {
  requires2FA: true;
  userId: string;
}

export interface RegisterMosqueData {
  mosqueName: string;
  mosqueAddress: string;
  mosqueCity: string;
  mosqueState: string;
  mosqueCountry: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone?: string;
}

export interface AcceptInviteData {
  token: string;
  name: string;
  fatherName?: string;
  phone: string;
  email: string;
  password: string;
}

export interface TwoFactorSetupResponse {
  qrCode: string | null;
  manualCode: string;
}

export interface VerifySecondFactorPayload {
  challengeToken: string;
  code: string;
}

export interface TwoFactorLoginPayload {
  userId: string;
  token: string;
}

export const authService = {
  async login(
    credentials: LoginCredentials,
  ): Promise<
    | AuthResponse
    | LoginEmailOtpResponse
    | LoginTotpResponse
    | LoginTwoFactorSetupResponse
    | LoginTwoFactorRequiredResponse
  > {
    const response = await api.post<
      | AuthResponse
      | LoginEmailOtpResponse
      | LoginTotpResponse
      | LoginTwoFactorSetupResponse
      | LoginTwoFactorRequiredResponse
    >(
      '/auth/login',
      credentials,
    );
    return response.data;
  },

  async verifyEmailOtp(payload: VerifySecondFactorPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-email-otp', payload);
    return response.data;
  },

  async verifyTotp(payload: VerifySecondFactorPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-totp', payload);
    return response.data;
  },

  async register(data: RegisterMosqueData): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  async verifyEmail(token: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/verify-email', { token });
    return response.data;
  },

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/resend-verification', { email });
    return response.data;
  },

  async acceptInvite(data: AcceptInviteData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/accept-invite', data);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors — we clear local state regardless
    }
    clearAccessToken();
    clearRefreshTokenAvailable();
    clearTwoFactorPending();
  },

  async getCurrentUser(): Promise<{ user: User; mosque: Mosque }> {
    const response = await api.get<{ user: User; mosque: Mosque }>('/auth/me');
    return response.data;
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await api.post<{ accessToken: string }>('/auth/refresh');
        this.setToken(response.data.accessToken);
        return response.data;
      } catch (error) {
        lastError = error;
        const hasHttpStatus =
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          Boolean((error as { response?: unknown }).response);

        const status =
          hasHttpStatus &&
          typeof (error as { response?: { status?: unknown } }).response?.status === 'number'
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        // Retry once for transport failures and refresh-token rotation races.
        if (attempt === 0 && (!hasHttpStatus || status === 401 || status === 403)) {
          continue;
        }

        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Refresh failed');
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword: password,
    });
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  async setupTwoFactor(userId: string, setupToken: string): Promise<TwoFactorSetupResponse> {
    const response = await api.post<TwoFactorSetupResponse>('/auth/2fa/setup', { userId, setupToken });
    return response.data;
  },

  async setupTwoFactorAuthenticated(): Promise<TwoFactorSetupResponse> {
    const response = await api.post<TwoFactorSetupResponse>('/auth/2fa/setup-authenticated');
    return response.data;
  },

  async enableTwoFactor(token: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/2fa/enable', { token });
    return response.data;
  },

  async verifyTwoFactor(userId: string, token: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/2fa/verify', { userId, token });
    return response.data;
  },

  async loginWithTwoFactor(payload: TwoFactorLoginPayload): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/2fa/login', payload);
    return response.data;
  },

  async setEmailOtp(enabled: boolean): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/email-otp', { enabled });
    return response.data;
  },

  async disableTwoFactor(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/2fa/disable');
    return response.data;
  },

  setToken(token: string): void {
    setAccessToken(token);
    if (typeof window !== 'undefined') {
      markRefreshTokenAvailable();
      clearTwoFactorPending();
    }
  },

  getToken(): string | null {
    return getAccessToken();
  },

  removeToken(): void {
    clearAccessToken();
    if (typeof window !== 'undefined') {
      clearRefreshTokenAvailable();
      clearTwoFactorPending();
    }
  },
};
