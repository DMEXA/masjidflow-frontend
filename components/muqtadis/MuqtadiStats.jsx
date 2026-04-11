import { Users, UserCheck, Clock3, Wallet, TrendingUp, House } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/stat-card';

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function MuqtadiStats({ stats, imamFundSummary, isLoading = false }) {
  const imamFundBalance = Number(imamFundSummary?.balance || 0);
  const imamFundIncome = Number(imamFundSummary?.totalIncome || 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 px-4 lg:grid-cols-3 -mx-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 px-4 lg:grid-cols-3 -mx-2">
      <StatCard title="Total Households" value={String(stats.totalHouseholds || 0)} description="Active verified households" icon={House} tone="blue" />
      <StatCard title="Total Muqtadies" value={String(stats.totalMuqtadies || 0)} description="Members in verified households" icon={Users} tone="purple" />
      <StatCard title="Imam Fund Balance" value={money.format(imamFundBalance)} description="Actual cash balance" icon={Wallet} tone="green" />
      <StatCard title="Imam Fund Income" value={money.format(imamFundIncome)} description="Verified income only" icon={TrendingUp} tone="yellow" />
      <StatCard title="Verified" value={String(stats.verified || 0)} description="Active verified households" icon={UserCheck} tone="green" />
      <StatCard title="Pending" value={String(stats.pending || 0)} description="Active unverified households" icon={Clock3} tone="yellow" />
    </div>
  );
}
