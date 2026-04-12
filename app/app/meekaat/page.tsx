'use client';

import { PrayerTimes } from '@/components/mosque/PrayerTimes';
import { AppShellLoader } from '@/components/common/app-shell-loader';
import { useAuthStore } from '@/src/store/auth.store';

export default function SharedMeekaatPage() {
  const { user, mosque } = useAuthStore();

  if (!user?.mosqueId) {
    return <AppShellLoader title="Loading prayer times" message="Preparing local salah schedule..." />;
  }

  return <PrayerTimes mosqueId={user.mosqueId} mosqueName={mosque?.name} />;
}
