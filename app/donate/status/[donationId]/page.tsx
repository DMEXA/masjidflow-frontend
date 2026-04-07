'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { donationsService } from '@/services/donations.service';
import type { Donation } from '@/types';
import { getErrorMessage, isRequestCanceled } from '@/src/utils/error';

function statusBadgeVariant(status: Donation['donationStatus']) {
  if (status === 'VERIFIED') return 'default';
  if (status === 'REJECTED') return 'destructive';
  return 'secondary';
}

export default function DonationStatusPage() {
  const params = useParams<{ donationId: string }>();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const proofUrl = useMemo(() => {
    if (!donation?.screenshotUrl) return '';
    return donation.screenshotUrl;
  }, [donation?.screenshotUrl]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await donationsService.getPublicDonationStatus(params.donationId);
        if (controller.signal.aborted) return;
        setDonation(data);
        setUpiTransactionId(data.upiTransactionId ?? '');
        setPhoneNumber(data.donorPhone ?? '');
      } catch (error) {
        if (isRequestCanceled(error) || controller.signal.aborted) {
          return;
        }
        const message = getErrorMessage(error, 'Failed to load donation status');
        setLoadError(message);
        toast.error(getErrorMessage(error, 'Failed to load donation status'));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();

    return () => controller.abort();
  }, [params.donationId]);

  const handleUpdateProof = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!donation) return;

    if (donation.donationStatus === 'INITIATED' && !phoneNumber.trim()) {
      toast.error('Phone number is required to submit donation proof.');
      return;
    }

    const trimmedUtr = upiTransactionId.trim();
    if (!trimmedUtr && !screenshot) {
      toast.error('Provide UTR or payment screenshot');
      return;
    }

    let uploadedScreenshotUrl: string | undefined;
    if (screenshot) {
      const allowedTypes = ['image/jpeg', 'image/png'];
      if (!allowedTypes.includes(screenshot.type)) {
        toast.error('Unsupported file type');
        return;
      }
      if (screenshot.size > 2 * 1024 * 1024) {
        toast.error('Screenshot too large');
        return;
      }
    }

    setIsUpdating(true);
    try {
      if (screenshot) {
        const upload = await donationsService.uploadDonationScreenshot(
          screenshot,
          donation.mosqueId,
        );
        uploadedScreenshotUrl = upload.url;
      }

      const updated = await donationsService.updatePublicDonationProof(donation.id, {
        phoneNumber: phoneNumber.trim() || undefined,
        screenshotUrl: uploadedScreenshotUrl,
        upiTransactionId: trimmedUtr || undefined,
      });

      setDonation(updated);
      setScreenshot(null);
      toast.success('Proof uploaded successfully');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update proof');
      if (message.includes('Donation session expired')) {
        toast.error('Session expired. Please start again.');
      } else {
        toast.error(message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <Card>
          <CardHeader className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>Unable to Load Donation Status</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/donate">Go to Donate Page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!donation) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
        <Card className="w-full text-center">
          <CardHeader>
            <CardTitle>Donation Not Found</CardTitle>
            <CardDescription>The donation status link is invalid or expired.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/donate">Go to Donate Page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Donation Status</CardTitle>
            <CardDescription>Track and manage your submitted donation proof.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Donation ID</p>
                <p className="font-medium">{donation.id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Intent ID</p>
                <p className="font-medium">{donation.intentId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={statusBadgeVariant(donation.donationStatus)}>
                  {donation.donationStatus}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mosque</p>
                <p className="font-medium">{(donation as any).mosqueName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Donor</p>
                <p className="font-medium">{donation.donorName?.trim() || 'Anonymous'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{donation.donorPhone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">INR {donation.amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fund</p>
                <p className="font-medium">{donation.fund?.name || donation.fund?.type || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">UTR</p>
                <p className="font-medium">{donation.upiTransactionId || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Screenshot Uploaded</p>
                <p className="font-medium">{donation.screenshotUrl ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {proofUrl && proofUrl.startsWith('http') ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Uploaded Screenshot</p>
                <Link href={proofUrl} className="text-sm text-primary underline">
                  View Screenshot
                </Link>
              </div>
            ) : null}

            {donation.donationStatus === 'VERIFIED' ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Receipt</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/donate/receipt/${donation.intentId}`}>View Receipt</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {donation.donationStatus === 'INITIATED' ? (
          <Card>
            <CardHeader>
              <CardTitle>Upload Proof</CardTitle>
              <CardDescription>
                Submit phone number and optional payment proof to move this donation for admin verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProof} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status-phone-number">Phone Number</Label>
                  <Input
                    id="status-phone-number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-transaction-id">UTR</Label>
                  <Input
                    id="status-transaction-id"
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                    placeholder="Optional"
                  />
                  <p className="text-xs text-muted-foreground">
                    GPay / PhonePe: check transaction details for Transaction ID (UTR)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-screenshot">Payment Screenshot (Optional)</Label>
                  <Input
                    id="status-screenshot"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  />
                </div>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Update Proof
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
