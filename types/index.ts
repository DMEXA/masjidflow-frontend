import type { UserRole, PaymentType, ExpenseCategory } from '@/src/constants';

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  name: string;
  fatherName?: string | null;
  isVerified?: boolean;
  role: UserRole;
  mosqueId: string;
  emailOtpEnabled?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  isPlatformAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Mosque {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  village?: string;
  country: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  logo?: string;
  subscriptionPlan: string;
  subscriptionExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Donation {
  id: string;
  mosqueId: string;
  intentId: string;
  donorName: string;
  donorEmail?: string;
  donorPhone?: string;
  donationStatus: 'INITIATED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  upiTransactionId?: string;
  screenshotUrl?: string;
  expiresAt?: string;
  rejectionReason?: string;
  reminderCount?: number;
  lastReminderSentAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  amount: number;
  currency?: string;
  paymentType: PaymentType | string;
  fundId?: string;
  description?: string;
  receipt?: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  fund?: {
    id: string;
    name: string;
    type: 'MASJID' | 'BAITUL_MAAL' | 'ZAKAT';
  };
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  method: 'UPI' | 'CASH' | 'BANK';
  reference?: string | null;
  utr?: string | null;
  intentId?: string | null;
  status: 'PENDING' | 'VERIFIED';
  cycleId?: string | null;
  month?: number | null;
  year?: number | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  mosqueId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  category: ExpenseCategory | string;
  amount: number;
  currency: string;
  fundId?: string;
  description: string;
  receipt?: string;
  vendor?: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  fund?: {
    id: string;
    name: string;
    type: 'MASJID' | 'BAITUL_MAAL' | 'ZAKAT';
  };
}

export interface Invitation {
  id: string;
  phone?: string | null;
  email?: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'TREASURER' | 'MEMBER' | 'MUQTADI' | 'VIEWER';
  invitedBy?: string;
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  cancelledAt?: string;
}

export interface Member {
  id: string;
  mosqueId: string;
  userId?: string | null;
  name: string;
  fatherName?: string | null;
  isMuqtadi?: boolean;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  invitedBy?: string;
}

export interface Muqtadi {
  id: string;
  userId?: string | null;
  name: string;
  fatherName: string;
  email?: string | null;
  householdMembers?: number | null;
  memberNames?: string[];
  whatsappNumber?: string | null;
  isVerified?: boolean;
  category?: string | null;
  phone?: string | null;
  notes?: string | null;
  totalDue?: number;
  totalPaid?: number;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID';
  status?: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  isDisabled: boolean;
}

export interface AuditLog {
  id: string;
  mosqueId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  totalDonationsThisMonth: number;
  totalExpensesThisMonth: number;
  currentBalance: number;
  donationsTrend: number;
  expensesTrend: number;
  totalMembers: number;
}

export interface ChartDataPoint {
  name: string;
  donations: number;
  expenses: number;
}

export interface ReportData {
  period: string;
  totalDonations: number;
  totalExpenses: number;
  netBalance: number;
  donationsByType: Record<PaymentType, number>;
  expensesByCategory: Record<ExpenseCategory, number>;
  monthlyTrend: ChartDataPoint[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  mosque: Mosque;
  role: string;
}

export interface FundSummary {
  id: string;
  name: string;
  description?: string | null;
  type: 'MASJID' | 'BAITUL_MAAL' | 'ZAKAT';
  allowedCategories: string[];
  isDefault: boolean;
  deletedAt?: string | null;
  totalDonations: number;
  totalExpenses: number;
  donationCount: number;
  expenseCount: number;
  balance: number;
}

export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
