'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/dashboard/page-header';
import { Download, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { donationsService } from '@/services/donations.service';
import { getErrorMessage } from '@/src/utils/error';

export default function DonationQrPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [qrConfig, setQrConfig] = useState<{
    mosqueName: string;
    mosqueSlug: string;
    donationPath: string;
  } | null>(null);
  const qrWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await donationsService.getQrConfig();
        setQrConfig(data);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load QR configuration'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const donationLink = useMemo(() => {
    if (!qrConfig) return '';
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
    if (base) {
      return `${base.replace(/\/$/, '')}${qrConfig.donationPath}`;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${qrConfig.donationPath}`;
    }
    return qrConfig.donationPath;
  }, [qrConfig]);

  const handleCopyLink = async () => {
    if (!donationLink) return;
    try {
      await navigator.clipboard.writeText(donationLink);
      toast.success('Donation link copied');
    } catch {
      toast.error('Failed to copy donation link');
    }
  };

  const handleDownload = async () => {
    if (!qrConfig || !qrWrapperRef.current) return;

    const canvas = qrWrapperRef.current.querySelector('canvas');
    if (!canvas) {
      toast.error('QR code is not ready yet');
      return;
    }

    setIsDownloading(true);
    try {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${qrConfig.mosqueSlug}-donation-qr.png`;
      link.click();
      toast.success('QR code downloaded');
    } catch {
      toast.error('Failed to download QR code');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donation QR Code"
        description="Generate and download your permanent mosque donation QR"
        backHref="/dashboard/donations"
        backLabel="Back to Donations"
        action={
          qrConfig
            ? {
                label: 'Download QR',
                icon: Download,
                onClick: handleDownload,
                disabled: isDownloading,
              }
            : undefined
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : !qrConfig ? (
        <Card>
          <CardHeader>
            <CardTitle>QR Configuration Unavailable</CardTitle>
            <CardDescription>Please try again later.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{qrConfig.mosqueName}</CardTitle>
              <CardDescription>Permanent donation link</CardDescription>
            </CardHeader>
            <CardContent className="ds-stack">
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm break-all">
                {donationLink}
              </div>

              <div ref={qrWrapperRef} className="flex justify-center rounded-xl border border-dashed border-border bg-white p-4">
                <QRCodeCanvas value={donationLink} size={260} includeMargin />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download QR Code
                </Button>
                <Button variant="outline" onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Donation Link
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Use This QR</CardTitle>
              <CardDescription>
                Print this QR code and place it inside your mosque. When donors scan it they will be redirected to your donation page.
              </CardDescription>
            </CardHeader>
            <CardContent className="ds-stack text-sm text-muted-foreground">
              <div className="rounded-xl border border-border p-3">
                <p className="font-medium text-foreground">Donor flow</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Scan QR</li>
                  <li>Enter amount</li>
                  <li>Pay via UPI</li>
                  <li>Upload proof</li>
                </ol>
              </div>
              <p>
                This QR is permanent for your mosque because it points to your stable slug route.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
