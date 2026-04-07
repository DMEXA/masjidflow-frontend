import { redirect } from 'next/navigation';

export default function VerifiedDonationsPage() {
  redirect('/dashboard/donations?status=verified');
}
