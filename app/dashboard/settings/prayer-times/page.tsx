import { redirect } from 'next/navigation';

export default function LegacyPrayerSettingsPage() {
  redirect('/dashboard/settings/prayer');
}
