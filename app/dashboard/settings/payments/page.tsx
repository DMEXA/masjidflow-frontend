import { redirect } from 'next/navigation';

export default function LegacyPaymentSettingsPage() {
  redirect('/dashboard/settings');
}
