export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TREASURER: 'treasurer',
  MEMBER: 'member',
  MUQTADI: 'muqtadi',
  VIEWER: 'viewer',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: {
    canManageMembers: true,
    canManageDonations: true,
    canManageExpenses: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canManageSettings: true,
    canManageSubscription: true,
    canDelete: true,
  },
  [USER_ROLES.ADMIN]: {
    canManageMembers: true,
    canManageDonations: true,
    canManageExpenses: true,
    canViewReports: true,
    canViewAuditLogs: true,
    canManageSettings: false,
    canManageSubscription: false,
    canDelete: true,
  },
  [USER_ROLES.TREASURER]: {
    canManageMembers: false,
    canManageDonations: true,
    canManageExpenses: true,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageSettings: false,
    canManageSubscription: false,
    canDelete: false,
  },
  [USER_ROLES.VIEWER]: {
    canManageMembers: false,
    canManageDonations: false,
    canManageExpenses: false,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageSettings: false,
    canManageSubscription: false,
    canDelete: false,
  },
  [USER_ROLES.MEMBER]: {
    canManageMembers: false,
    canManageDonations: false,
    canManageExpenses: false,
    canViewReports: true,
    canViewAuditLogs: false,
    canManageSettings: false,
    canManageSubscription: false,
    canDelete: false,
  },
  [USER_ROLES.MUQTADI]: {
    canManageMembers: false,
    canManageDonations: false,
    canManageExpenses: false,
    canViewReports: false,
    canViewAuditLogs: false,
    canManageSettings: false,
    canManageSubscription: false,
    canDelete: false,
  },
} as const;

export const PAYMENT_TYPES = ['cash', 'bank_transfer', 'upi', 'cheque', 'online', 'OTHER'] as const;
export type PaymentType = typeof PAYMENT_TYPES[number];

export const EXPENSE_CATEGORIES = [
  'utilities',
  'maintenance',
  'salary',
  'cleaning',
  'repairs',
  'salaries',
  'events',
  'supplies',
  'charity',
  'community_support',
  'education',
  'medical_help',
  'welfare',
  'zakat_distribution',
  'construction',
  'other',
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const FUND_EXPENSE_CATEGORIES = {
  MASJID: ['utilities', 'maintenance', 'salary', 'cleaning', 'repairs', 'supplies', 'other'],
  BAITUL_MAAL: ['charity', 'community_support', 'education', 'medical_help', 'welfare', 'other'],
  ZAKAT: ['charity', 'zakat_distribution', 'welfare', 'other'],
} as const;

export const SUBSCRIPTION_PLANS = {
  FREE_TRIAL: {
    id: 'free_trial',
    name: 'Free Trial',
    price: 0,
    duration: '15 days',
    features: ['Basic donation tracking', 'Expense management', 'Limited reports'],
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 299,
    currency: '₹',
    duration: 'month',
    features: [
      'Donation management',
      'Expense tracking',
      'Reports',
      'Audit logs',
      'Member management',
    ],
  },
  ADVANCED_PREMIUM: {
    id: 'advanced_premium',
    name: 'Advanced Premium',
    price: 399,
    currency: '₹',
    duration: 'month',
    features: [
      'QR donations',
      'Online donations',
      'SMS notifications',
      'Multi-branch mosques',
      'Advanced analytics',
      'Priority support',
    ],
  },
} as const;
