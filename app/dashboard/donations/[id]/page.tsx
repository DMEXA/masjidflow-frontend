'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, FileText, HandCoins, Copy } from 'lucide-react';
import { donationsService } from '@/services/donations.service';
import { formatCurrency, formatDate, formatPaymentType } from '@/src/utils/format';
import type { Donation } from '@/types';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { usePermission } from '@/hooks/usePermission';
import { API_BASE_URL } from '@/src/constants';

function resolveReceiptUrl(receipt: string, baseOrigin: string): string | null {
  const raw = receipt.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^https?\/\//i.test(raw)) {
    return raw.replace(/^https?\/\//i, (match) =>
      match.toLowerCase().startsWith('https') ? 'https://' : 'http://',
    );
  }

  if (raw.startsWith('//')) {
    return `https:${raw}`;
  }

  if (raw.startsWith('/')) {
    return `${baseOrigin}${raw}`;
  }

  return `${baseOrigin}/${raw}`;
}

export default function DonationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canManageDonations, isTreasurer } = usePermission();

  useEffect(() => {
    if (!canManageDonations) {
      router.replace('/dashboard');
    }
  }, [canManageDonations, router]);

  if (!canManageDonations) {
    return null;
  }

  const [donation, setDonation] = useState<Donation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleViewReceipt = () => {
    if (!donation?.receipt) return;
    const receiptUrl = resolveReceiptUrl(
      donation.receipt,
      API_BASE_URL.replace('/api/v1', ''),
    );
    if (!receiptUrl) {
      toast.error('Receipt URL is invalid');
      return;
    }
    router.push(receiptUrl);
  };

  const handleCopyUtr = async (value?: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('UTR copied');
    } catch {
      toast.error('Failed to copy UTR');
    }
  };

  useEffect(() => {
    const fetchDonation = async () => {
      try {
        const data = await donationsService.getById(params.id);
        setDonation(data);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load donation details'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchDonation();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="rounded-lg border p-6 space-y-4">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Donation not found.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/donations">Back to Donations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/donations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Donation Details
          </h1>
          <p className="text-sm text-muted-foreground">ID: {donation.id}</p>
        </div>
      </div>

      {/* Amount highlight card */}
      <Card className="border-border bg-green-50 dark:bg-green-950/20">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <HandCoins className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Amount Donated</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(donation.amount, donation.currency ?? '₹')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Details card */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Donor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Donor Name
              </p>
              <p className="text-sm font-medium text-foreground">
                {donation.donorName}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Payment Type
              </p>
              <Badge variant="secondary">
                {formatPaymentType(donation.paymentType)}
              </Badge>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <Badge variant="outline">{donation.donationStatus}</Badge>
            </div>

            {donation.donorEmail && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <p className="text-sm text-foreground">{donation.donorEmail}</p>
              </div>
            )}

            {donation.donorPhone && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Phone
                </p>
                <p className="text-sm text-foreground">{donation.donorPhone}</p>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Date
              </p>
              <p className="text-sm text-foreground">
                {formatDate(donation.createdAt)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                UTR
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-foreground">{donation.upiTransactionId || 'Not provided'}</p>
                {donation.upiTransactionId ? (
                  <Button size="sm" variant="ghost" onClick={() => handleCopyUtr(donation.upiTransactionId)}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Copy UTR
                  </Button>
                ) : null}
              </div>
            </div>

            {donation.createdByName && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Recorded By
                </p>
                <p className="text-sm text-foreground">
                  {donation.createdByName}
                </p>
              </div>
            )}
          </div>

          {(donation.description || donation.receipt) && (
            <>
              <Separator />
              {donation.description && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Description / Notes
                  </p>
                  <p className="text-sm text-foreground">{donation.description}</p>
                </div>
              )}

              {donation.receipt && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Receipt
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewReceipt}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Receipt
                  </Button>
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Screenshot
            </p>
            {donation?.screenshotUrl ? (
              <Link
                href={donation.screenshotUrl}
                className="text-blue-600 underline"
              >
                View Proof
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Not provided</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard/donations">Back to Donations</Link>
        </Button>
        {!(isTreasurer && donation.donationStatus === 'VERIFIED') ? (
          <Button asChild>
            <Link href={`/dashboard/donations/${donation.id}/edit`}>Edit Donation</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
