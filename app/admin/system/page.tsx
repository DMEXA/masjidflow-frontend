'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { platformAdminService, type PlatformSystemStatus } from '@/services/platform-admin.service';
import { Database, Building, Users, Clock, FileWarning } from 'lucide-react';

const EMPTY_SYSTEM: PlatformSystemStatus = {
  databaseConnected: false,
  activeMosques: 0,
  activeUsers: 0,
  pendingDonationProofs: 0,
  serverUptime: 0,
};

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

export default function PlatformSystemPage() {
  const [system, setSystem] = useState<PlatformSystemStatus>(EMPTY_SYSTEM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystem = async () => {
      setLoading(true);
      try {
        const data = await platformAdminService.getSystemStatus();
        setSystem(data);
      } finally {
        setLoading(false);
      }
    };

    fetchSystem();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="System" description="Live platform health overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Database"
          value={loading ? 'Loading...' : system.databaseConnected ? 'Connected' : 'Disconnected'}
          icon={Database}
          iconClassName={system.databaseConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
        />
        <StatCard
          title="Active Mosques"
          value={loading ? 'Loading...' : String(system.activeMosques)}
          icon={Building}
          iconClassName="bg-blue-100 text-blue-700"
        />
        <StatCard
          title="Active Users"
          value={loading ? 'Loading...' : String(system.activeUsers)}
          icon={Users}
          iconClassName="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          title="Pending Donation Proofs"
          value={loading ? 'Loading...' : String(system.pendingDonationProofs)}
          icon={FileWarning}
          iconClassName="bg-amber-100 text-amber-700"
        />
        <StatCard
          title="Server Uptime"
          value={loading ? 'Loading...' : formatUptime(system.serverUptime)}
          icon={Clock}
          iconClassName="bg-indigo-100 text-indigo-700"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Health metrics are computed from platform-admin system endpoints and shown in near real time.
        </CardContent>
      </Card>
    </div>
  );
}
