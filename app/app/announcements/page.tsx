'use client';

import { Announcements } from '@/components/mosque/Announcements';
import { AppShellLoader } from '@/components/common/app-shell-loader';
import { useAuthStore } from '@/src/store/auth.store';

export default function SharedAnnouncementsPage() {
  const { user } = useAuthStore();

  if (!user?.mosqueId) {
    return <AppShellLoader title="Loading announcements" message="Preparing mosque announcement feed..." />;
  }

  return <Announcements mosqueId={user.mosqueId} />;
}
