import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(amount: number, currency: string = '₹'): string {
  if (currency === '₹') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return `${currency}${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatDate(date: string | Date, formatStr: string = 'MMM dd, yyyy'): string {
  return format(new Date(date), formatStr);
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatPaymentType(type: string): string {
  const types: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    upi: 'UPI',
    cheque: 'Cheque',
    online: 'Online',
    OTHER: 'Other',
  };
  if (types[type]) return types[type];
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatExpenseCategory(category: string): string {
  const categories: Record<string, string> = {
    utilities: 'Utilities',
    maintenance: 'Maintenance',
    salary: 'Salary',
    cleaning: 'Cleaning',
    repairs: 'Repairs',
    salaries: 'Salaries',
    events: 'Events',
    supplies: 'Supplies',
    charity: 'Charity',
    community_support: 'Community Support',
    education: 'Education',
    medical_help: 'Medical Help',
    welfare: 'Welfare',
    zakat_distribution: 'Zakat Distribution',
    construction: 'Construction',
    other: 'Other',
  };
  if (categories[category]) return categories[category];
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function formatRole(role: string): string {
  const roles: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    treasurer: 'Treasurer',
    viewer: 'Viewer',
  };
  return roles[role] || role;
}

export function formatCycleLabel(month: number, year: number): string {
  return new Date(year, month - 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function getCycleStatus(month: number, year: number): 'Active' | 'Completed' {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cycleStart = new Date(year, month - 1, 1);
  return cycleStart >= currentMonthStart ? 'Active' : 'Completed';
}

export function formatTrend(value: number): { text: string; isPositive: boolean } {
  const isPositive = value >= 0;
  const text = `${isPositive ? '+' : ''}${value.toFixed(1)}%`;
  return { text, isPositive };
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
