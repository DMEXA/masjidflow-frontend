'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { FinancialChart } from '@/components/dashboard/financial-chart';
import { DonationChart } from '@/components/dashboard/donation-chart';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/src/utils/format';
import { getErrorMessage } from '@/src/utils/error';
import { Download, FileText, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { reportsService } from '@/services/reports.service';
import { donationsService } from '@/services/donations.service';
import { expensesService } from '@/services/expenses.service';
import { usePermission } from '@/hooks/usePermission';
import { ListEmptyState } from '@/components/common/list-empty-state';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReportsPage() {
  const router = useRouter();
  const { canViewReports } = usePermission();

  useEffect(() => {
    if (!canViewReports) {
      router.replace('/dashboard');
    }
  }, [canViewReports, router]);

  if (!canViewReports) {
    return null;
  }

  const [period, setPeriod] = useState('6months');
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ name: string; donations: number; expenses: number }[]>([]);
  const [yearlyTotals, setYearlyTotals] = useState({ totalDonations: 0, totalExpenses: 0, net: 0 });
  const [donationsByType, setDonationsByType] = useState<{ type: string; amount: number }[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<{ category: string; amount: number }[]>([]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const [monthly, yearly, donationsRes, expensesRes] = await Promise.all([
        reportsService.getMonthlyReport(),
        reportsService.getYearlyReport(),
        donationsService.getAll({ limit: 100, donationStatus: 'VERIFIED' }),
        expensesService.getAll({ pageSize: 100 }),
      ]);

      // Map monthly data for the financial chart
      setMonthlyData(
        monthly.data.map((m) => ({
          name: MONTH_NAMES[m.month - 1],
          donations: m.totalDonations,
          expenses: m.totalExpenses,
        }))
      );

      setYearlyTotals(yearly);

      // Aggregate donations by payment type
      const typeMap: Record<string, number> = {};
      for (const d of donationsRes.data) {
        const t = d.paymentType ?? 'other';
        typeMap[t] = (typeMap[t] || 0) + Number(d.amount);
      }
      setDonationsByType(
        Object.entries(typeMap).map(([type, amount]) => ({
          type: type.charAt(0).toUpperCase() + type.slice(1),
          amount,
        }))
      );

      // Aggregate expenses by category
      const catMap: Record<string, number> = {};
      for (const e of expensesRes.data) {
        const c = e.category ?? 'other';
        catMap[c] = (catMap[c] || 0) + Number(e.amount);
      }
      setExpensesByCategory(
        Object.entries(catMap).map(([category, amount]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          amount,
        }))
      );
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load reports'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = (format: 'pdf' | 'csv') => {
    void format;
  };

  const hasNoData = monthlyData.length === 0 && yearlyTotals.totalDonations === 0 && yearlyTotals.totalExpenses === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Financial reports and analytics"
      >
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-45">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Last 1 Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last 1 Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => handleExport('csv')}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button onClick={() => handleExport('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
            <div className="h-24 rounded-xl bg-muted" />
          </div>
          <div className="h-72 rounded-xl bg-muted" />
          <div className="h-72 rounded-xl bg-muted" />
        </div>
      ) : hasNoData ? (
        <Card className="border-border">
          <CardContent className="py-8">
            <ListEmptyState
              title="No report data available"
              description="Add donations or expenses to generate report insights."
              actionLabel="Refresh Reports"
              onAction={() => {
                void fetchReports();
              }}
              icon={<FileText className="h-5 w-5" />}
            />
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Total Donations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(yearlyTotals.totalDonations)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Total Expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(yearlyTotals.totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground">Net Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(yearlyTotals.net)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total income minus expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FinancialChart
            data={monthlyData}
            title="Monthly Financial Overview"
            description="Donations vs Expenses over time"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <DonationChart
              data={donationsByType}
              title="Donations by Payment Type"
              description="Breakdown of donation methods"
            />
            <ExpenseChart
              data={expensesByCategory}
              title="Expenses by Category"
              description="Where the money is being spent"
            />
          </div>
        </TabsContent>

        <TabsContent value="donations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Donation Breakdown</CardTitle>
                <CardDescription className="text-muted-foreground">
                  By payment type for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="ds-stack">
                  {donationsByType.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-primary" />
                        <span className="text-sm text-foreground">{item.type}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
                        <p className="text-xs text-muted-foreground">
                          {yearlyTotals.totalDonations > 0
                            ? ((item.amount / yearlyTotals.totalDonations) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <DonationChart
              data={donationsByType}
              title="Visual Breakdown"
              description="Payment type distribution"
            />
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Expense Breakdown</CardTitle>
                <CardDescription className="text-muted-foreground">
                  By category for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="ds-stack">
                  {expensesByCategory.map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-chart-5" />
                        <span className="text-sm text-foreground">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
                        <p className="text-xs text-muted-foreground">
                          {yearlyTotals.totalExpenses > 0
                            ? ((item.amount / yearlyTotals.totalExpenses) * 100).toFixed(1)
                            : 0}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <ExpenseChart
              data={expensesByCategory}
              title="Visual Breakdown"
              description="Category distribution"
            />
          </div>
        </TabsContent>
      </Tabs>
      </>
      )}
    </div>
  );
}
