'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListEmptyState } from '@/components/common/list-empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { fundsService } from '@/services/funds.service';
import type { Fund } from '@/services/funds.service';
import type { Donation, Expense } from '@/types';
import { getErrorMessage } from '@/src/utils/error';
import { formatCurrency, formatDate } from '@/src/utils/format';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

const fundTypeLabels: Record<Fund['type'], string> = {
  MASJID: 'Masjid',
  BAITUL_MAAL: 'Baitul Maal',
  ZAKAT: 'Zakat',
};

function getStatusBadgeVariant(status: Donation['donationStatus']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'VERIFIED') return 'default';
  if (status === 'PENDING') return 'secondary';
  if (status === 'REJECTED') return 'destructive';
  return 'outline';
}

function FundDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="space-y-4">
      <PageHeader title="Fund not found" description="This fund may not exist or you may not have access." />
      <Button variant="outline" asChild>
        <Link href="/dashboard/funds">Back to Funds</Link>
      </Button>
    </div>
  );
}

export default function FundDetailPage() {
  const params = useParams<{ fundId: string }>();
  const fundId = params.fundId;
  const queryClient = useQueryClient();
  const [isCategoryEditorOpen, setIsCategoryEditorOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const fetchFund = ({ signal }: { signal: AbortSignal }) => {
    return fundsService.getDetails(fundId, { signal });
  };

  const fundQuery = useQuery({
    queryKey: ['fund', fundId],
    queryFn: fetchFund,
    enabled: Boolean(fundId),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const fund = fundQuery.data?.fund as Fund | undefined;
  const fundSummary = fundQuery.data?.summary;
  const donations = (fundQuery.data?.recentDonations ?? []) as Donation[];
  const expenses = (fundQuery.data?.recentExpenses ?? []) as Expense[];

  useEffect(() => {
    if (!fundQuery.error) return;
    toast.error(getErrorMessage(fundQuery.error, 'Failed to load fund details'));
  }, [fundQuery.error]);

  const recentDonations = useMemo(() => donations.slice(0, 10), [donations]);
  const recentExpenses = useMemo(() => expenses.slice(0, 10), [expenses]);

  const categories = useMemo(() => {
    if (!fund?.allowedCategories || fund.allowedCategories.length === 0) {
      return ['other'];
    }
    return fund.allowedCategories;
  }, [fund?.allowedCategories]);

  const handleAddCategory = async () => {
    if (!fund || !newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setIsAddingCategory(true);
    try {
      await fundsService.addCategory(fund.id, { category: newCategory });
      setNewCategory('');
      setIsCategoryEditorOpen(false);
      await Promise.all([
        fundQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['funds'] }),
      ]);
      toast.success('Category added successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to add category'));
    } finally {
      setIsAddingCategory(false);
    }
  };

  const chartData = useMemo(() => {
    if (!fundSummary) return [];

    return [
      {
        name: 'This Fund',
        donations: fundSummary.totalDonations,
        expenses: fundSummary.totalExpenses,
      },
    ];
  }, [fundSummary]);

  if (fundQuery.isLoading) {
    return <FundDetailSkeleton />;
  }

  if (fundQuery.error && !fundQuery.data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Unable to load fund" description={getErrorMessage(fundQuery.error, 'Failed to load fund details')} />
        <Button variant="outline" onClick={() => fundQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!fund || !fundSummary) {
    return <NotFound />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={fund.name} description="Detailed fund financial overview">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/funds">
            {fundQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
            Back to Funds
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Fund Header</CardTitle>
          <CardDescription>Professional financial summary for this fund.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Fund Name</p>
            <p className="text-lg font-semibold text-foreground">{fund.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="text-sm text-foreground">{fund.description || 'No description provided.'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created Date</p>
            <p className="text-sm font-medium text-foreground">{formatDate(fund.createdAt)}</p>
            <Badge variant="secondary" className="mt-2">{fundTypeLabels[fund.type]}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fund Categories</CardTitle>
          <CardDescription>
            Categories available for expenses in this fund.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category} variant="outline">{category}</Badge>
            ))}
          </div>

          {fund.isDefault ? (
            <p className="text-sm text-muted-foreground">
              Default fund categories are managed by the system and cannot be modified.
            </p>
          ) : (
            <div className="space-y-3">
              {!isCategoryEditorOpen ? (
                <Button type="button" variant="outline" onClick={() => setIsCategoryEditorOpen(true)}>
                  Add Category
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. iftar"
                    className="w-full max-w-xs"
                    disabled={isAddingCategory}
                  />
                  <Button type="button" onClick={handleAddCategory} disabled={isAddingCategory}>
                    {isAddingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setNewCategory('');
                      setIsCategoryEditorOpen(false);
                    }}
                    disabled={isAddingCategory}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-green-600">{formatCurrency(fundSummary.totalDonations)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-600">{formatCurrency(fundSummary.totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${fundSummary.balance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
              {formatCurrency(fundSummary.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donations vs Expenses</CardTitle>
          <CardDescription>Simple comparison chart for this fund.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            className="h-70 w-full"
            config={{
              donations: { label: 'Donations', color: 'hsl(142 76% 36%)' },
              expenses: { label: 'Expenses', color: 'hsl(0 84% 60%)' },
            }}
          >
            <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="donations" fill="var(--color-donations)" radius={6} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
          <CardDescription>Most recent 10 donation transactions for this fund.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDonations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4">
                      <ListEmptyState
                        title="No donations for this fund"
                        description="Record a donation to start tracking this fund's inflow."
                        actionLabel="Add Donation"
                        actionHref="/dashboard/donations/add"
                        className="min-h-36"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  recentDonations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>{donation.donorName?.trim() || 'Anonymous'}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(donation.amount, donation.currency ?? '₹')}
                      </TableCell>
                      <TableCell>{formatDate(donation.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(donation.donationStatus)}>
                          {donation.donationStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {recentDonations.length === 0 ? (
              <ListEmptyState
                title="No donations for this fund"
                description="Record a donation to start tracking this fund's inflow."
                actionLabel="Add Donation"
                actionHref="/dashboard/donations/add"
                className="min-h-40"
              />
            ) : (
              recentDonations.map((donation) => (
                <Card key={donation.id} className="border-border">
                  <CardContent className="space-y-2 pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-foreground">{donation.donorName?.trim() || 'Anonymous'}</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(donation.amount, donation.currency ?? '₹')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <p>{formatDate(donation.createdAt)}</p>
                      <Badge variant={getStatusBadgeVariant(donation.donationStatus)}>{donation.donationStatus}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Most recent 10 expense transactions for this fund.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-4">
                      <ListEmptyState
                        title="No expenses for this fund"
                        description="Add an expense when this fund is used."
                        actionLabel="Add Expense"
                        actionHref="/dashboard/expenses/add"
                        className="min-h-36"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  recentExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell className="font-medium text-red-600">
                        {formatCurrency(expense.amount, '₹')}
                      </TableCell>
                      <TableCell>{formatDate(expense.createdAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {recentExpenses.length === 0 ? (
              <ListEmptyState
                title="No expenses for this fund"
                description="Add an expense when this fund is used."
                actionLabel="Add Expense"
                actionHref="/dashboard/expenses/add"
                className="min-h-40"
              />
            ) : (
              recentExpenses.map((expense) => (
                <Card key={expense.id} className="border-border">
                  <CardContent className="space-y-2 overflow-hidden pt-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate font-medium text-foreground" title={expense.description}>
                        {expense.description}
                      </p>
                      <p className="font-semibold text-red-600">{formatCurrency(expense.amount, '₹')}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <p>{formatDate(expense.createdAt)}</p>
                      <p>Expense</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
