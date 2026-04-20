'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { membersService } from '@/services/members.service';
import { queryKeys } from '@/lib/query-keys';

export interface DashboardStats {
  totalDonations: number;
  totalExpenses: number;
  net: number;
  totalMembers: number;
}

export interface DashboardChartPoint {
  name: string;
  donations: number;
  expenses: number;
  funds: Record<string, { donations: number; expenses: number }>;
}

export interface DashboardFundSummary {
  fundId: string;
  name: string;
  donations: number;
  expenses: number;
  balance: number;
}

export interface DashboardOverview {
  chartData: DashboardChartPoint[];
  donationsByType: { type: string; amount: number }[];
  expensesByCategory: { category: string; amount: number }[];
  funds: DashboardFundSummary[];
}

export interface RecentDonation {
  id: string;
  donorName: string;
  amount: number;
  paymentType: string;
  createdAt: string;
}

interface YearlyReportResponse {
  totalDonations: number;
  totalExpenses: number;
  net: number;
}

interface DashboardOverviewResponse {
  stats: DashboardStats;
  recentDonations: RecentDonation[];
  charts: DashboardOverview;
}

export function useDashboardOverviewQuery(options: {
  mosqueId?: string;
  chartsLimit: number;
  enabled: boolean;
}) {
  const { mosqueId, chartsLimit, enabled } = options;

  return useQuery<DashboardOverviewResponse>({
    queryKey: [...queryKeys.dashboardOverview(mosqueId), { chartsLimit }],
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 8000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: async () => {
      const [yearlyResult, membersResult] = await Promise.allSettled([
        api.get<YearlyReportResponse>('/reports/yearly').then((r) => r.data),
        membersService.getAll({ page: 1, pageSize: 1 }),
      ]);

      const [donationsResult, expensesResult] = await Promise.allSettled([
        api.get(`/donations?limit=${chartsLimit}`).then((r) => r.data),
        api.get(`/expenses?limit=${chartsLimit}`).then((r) => r.data),
      ]);

      if (
        yearlyResult.status === 'rejected'
        && membersResult.status === 'rejected'
        && donationsResult.status === 'rejected'
        && expensesResult.status === 'rejected'
      ) {
        throw yearlyResult.reason;
      }

      const yearlyResponse: YearlyReportResponse =
        yearlyResult.status === 'fulfilled'
          ? yearlyResult.value
          : { totalDonations: 0, totalExpenses: 0, net: 0 };

      const membersResponse =
        membersResult.status === 'fulfilled'
          ? membersResult.value
          : { total: 0 };

      const donationsRes =
        donationsResult.status === 'fulfilled'
          ? donationsResult.value
          : { data: [] as Array<unknown> };

      const expensesRes =
        expensesResult.status === 'fulfilled'
          ? expensesResult.value
          : { data: [] as Array<unknown> };

      const stats: DashboardStats = {
        totalDonations: yearlyResponse.totalDonations || 0,
        totalExpenses: yearlyResponse.totalExpenses || 0,
        net: yearlyResponse.net || 0,
        totalMembers: membersResponse.total || 0,
      };

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const donationList: Array<{
        amount: number;
        paymentType: string;
        createdAt: string;
        id: string;
        donorName?: string;
        fundId?: string;
        fund?: { id?: string; name?: string };
        donationStatus?: string;
      }> = donationsRes.data ?? [];
      const expenseList: Array<{
        amount: number;
        category?: string;
        createdAt: string;
        fundId?: string;
        fund?: { id?: string; name?: string };
      }> = expensesRes.data ?? [];

      const monthlyFundMap = new Map<number, Record<string, { donations: number; expenses: number }>>();

      for (let month = 1; month <= 12; month += 1) {
        monthlyFundMap.set(month, {});
      }

      for (const donation of donationList) {
        const fundId = donation.fundId ?? donation.fund?.id;
        if (!fundId) continue;

        const month = new Date(donation.createdAt).getMonth() + 1;
        const monthFunds = monthlyFundMap.get(month);
        if (!monthFunds) continue;

        const existing = monthFunds[fundId] ?? { donations: 0, expenses: 0 };
        existing.donations += Number(donation.amount ?? 0);
        monthFunds[fundId] = existing;
      }

      for (const expense of expenseList) {
        const fundId = expense.fundId ?? expense.fund?.id;
        if (!fundId) continue;

        const month = new Date(expense.createdAt).getMonth() + 1;
        const monthFunds = monthlyFundMap.get(month);
        if (!monthFunds) continue;

        const existing = monthFunds[fundId] ?? { donations: 0, expenses: 0 };
        existing.expenses += Number(expense.amount ?? 0);
        monthFunds[fundId] = existing;
      }

      const chartData: DashboardChartPoint[] = monthNames.map((name, index) => {
        const month = index + 1;
        const monthlyFunds = monthlyFundMap.get(month) ?? {};
        let monthDonations = 0;
        let monthExpenses = 0;

        for (const entry of Object.values(monthlyFunds)) {
          monthDonations += Number(entry.donations ?? 0);
          monthExpenses += Number(entry.expenses ?? 0);
        }

        return {
          name,
          donations: monthDonations,
          expenses: monthExpenses,
          funds: monthlyFunds,
        };
      });

      const paymentLabels: Record<string, string> = {
        cash: 'Cash',
        upi: 'UPI',
        bank_transfer: 'Bank',
        online: 'Online',
      };

      const typeMap: Record<string, number> = {};
      for (const donation of donationList) {
        typeMap[donation.paymentType] = (typeMap[donation.paymentType] || 0) + Number(donation.amount);
      }

      const donationsByType = Object.entries(typeMap).map(([type, amount]) => ({
        type: paymentLabels[type] ?? type,
        amount,
      }));

      const categoryMap: Record<string, number> = {};
      for (const expense of expenseList) {
        const category = expense.category ?? 'other';
        categoryMap[category] = (categoryMap[category] || 0) + Number(expense.amount);
      }

      const expensesByCategory = Object.entries(categoryMap).map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
      }));

      const fundMap = new Map<string, DashboardFundSummary>();

      for (const donation of donationList) {
        const fundId = donation.fundId ?? donation.fund?.id;
        if (!fundId) continue;

        const existing = fundMap.get(fundId) ?? {
          fundId,
          name: donation.fund?.name ?? 'Unknown Fund',
          donations: 0,
          expenses: 0,
          balance: 0,
        };

        existing.donations += Number(donation.amount ?? 0);
        existing.balance = existing.donations - existing.expenses;
        fundMap.set(fundId, existing);
      }

      for (const expense of expenseList) {
        const fundId = expense.fundId ?? expense.fund?.id;
        if (!fundId) continue;

        const existing = fundMap.get(fundId) ?? {
          fundId,
          name: expense.fund?.name ?? 'Unknown Fund',
          donations: 0,
          expenses: 0,
          balance: 0,
        };

        existing.expenses += Number(expense.amount ?? 0);
        existing.balance = existing.donations - existing.expenses;
        fundMap.set(fundId, existing);
      }

      const funds = Array.from(fundMap.values()).sort((a, b) => b.balance - a.balance);

      return {
        stats,
        recentDonations: donationList.slice(0, 5).map((donation) => ({
          id: donation.id,
          donorName: donation.donorName ?? 'Anonymous',
          amount: Number(donation.amount ?? 0),
          paymentType: donation.paymentType,
          createdAt: donation.createdAt,
        })),
        charts: {
          chartData,
          donationsByType,
          expensesByCategory,
          funds,
        },
      };
    },
  });
}
