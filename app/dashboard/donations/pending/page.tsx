'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Clock3,
  Wallet,
  AlertTriangle,
  CircleAlert,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { donationsService } from '@/services/donations.service';
import type { Donation } from '@/types';
import { getErrorMessage } from '@/src/utils/error';
import { formatDate } from '@/src/utils/format';
import { usePermission } from '@/hooks/usePermission';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ActionOverflowMenu } from '@/components/common/action-overflow-menu';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { invalidateMoneyQueries } from '@/lib/money-cache';

function toWaLink(phone?: string) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export default function PendingDonationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, isSuperAdmin } = usePermission();

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, isSuperAdmin, router]);

  if (!isAdmin && !isSuperAdmin) {
    return null;
  }

  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING'>('PENDING');
  const [verifyTarget, setVerifyTarget] = useState<Donation | null>(null);
  const [verifyTransactionId, setVerifyTransactionId] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [manualConfirm, setManualConfirm] = useState(false);
  const [intentMatchedViaReconciliation, setIntentMatchedViaReconciliation] = useState(false);
  const fetchLockRef = useRef(false);
  const listCacheRef = useRef<{ key: string; at: number; data: Donation[] } | null>(null);

  const refreshDonationQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.some((part) => String(part) === 'pending-count'),
    });
    await queryClient.invalidateQueries({
      predicate: (query) => query.queryKey.some((part) => String(part) === 'donations'),
    });
  }, [queryClient]);

  const fetchPending = useCallback(async () => {
    if (fetchLockRef.current) return;
    const cacheKey = statusFilter;
    const now = Date.now();
    const cache = listCacheRef.current;
    if (cache && cache.key === cacheKey && now - cache.at < 5000) {
      setDonations(cache.data);
      setSelectedIds((prev) => prev.filter((id) => cache.data.some((item) => item.id === id)));
      return;
    }

    fetchLockRef.current = true;
    setIsLoading(true);
    try {
      const data = await donationsService.getPending();
      const bounded = data.length > 50 ? data.slice(0, 50) : data;
      setDonations(bounded);
      setSelectedIds((prev) => prev.filter((id) => data.some((item) => item.id === id)));
      listCacheRef.current = { key: cacheKey, at: now, data: bounded };
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load pending donations'));
    } finally {
      setIsLoading(false);
      fetchLockRef.current = false;
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async () => {
    if (!verifyTarget) return;

    const transaction = verifyTransactionId.trim();
    const note = verificationNote.trim();
    const hasScreenshotEvidence = Boolean(verifyTarget.screenshotUrl);
    const hasTransactionEvidence = Boolean(transaction || verifyTarget.upiTransactionId?.trim());
    const hasIntentEvidence = intentMatchedViaReconciliation;
    const allowManual = manualConfirm;

    if (!hasScreenshotEvidence && !hasTransactionEvidence && !hasIntentEvidence && !allowManual) {
      toast.error('Please confirm manual verification when no proof is available.');
      return;
    }

    const evidenceOptions = [
      hasScreenshotEvidence ? 'Screenshot verified' : null,
      hasTransactionEvidence ? 'UTR verified' : null,
      hasIntentEvidence ? 'Intent ID matched via reconciliation' : null,
      allowManual ? 'Manual verification (bank statement checked)' : null,
    ].filter((value): value is string => Boolean(value));

    const autoEvidenceNote = evidenceOptions.length > 0
      ? `Verification evidence: ${evidenceOptions.join(', ')}.`
      : '';

    const finalNote = note || autoEvidenceNote || undefined;

    setProcessingId(verifyTarget.id);
    try {
      const updated = await donationsService.approvePending(verifyTarget.id, {
        upiTransactionId: transaction || undefined,
        verificationNote: finalNote,
        manualConfirm: allowManual,
      });

      setDonations((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      toast.success('Donation verified successfully');
      setVerifyTarget(null);
      setVerifyTransactionId('');
      setVerificationNote('');
      setManualConfirm(false);
      setIntentMatchedViaReconciliation(false);
      await refreshDonationQueries();
      await invalidateMoneyQueries(queryClient);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to approve donation'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await donationsService.rejectPending(id);
      toast.success('Donation rejected');
      await refreshDonationQueries();
      await invalidateMoneyQueries(queryClient);
      await fetchPending();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reject donation'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualReminder = async (id: string) => {
    setProcessingId(id);
    try {
      await donationsService.sendManualReminder(id);
      toast.success('WhatsApp reminder sent');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send WhatsApp reminder'));
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = donations.length;
  const filteredDonations = useMemo(() => {
    if (statusFilter === 'ALL') return donations;
    return donations.filter((item) => item.donationStatus === statusFilter);
  }, [donations, statusFilter]);
  const pendingTotalAmount = useMemo(
    () => filteredDonations.reduce((sum, item) => sum + item.amount, 0),
    [filteredDonations],
  );
  const missingTransactionCount = useMemo(
    () => filteredDonations.filter((item) => !item.upiTransactionId).length,
    [filteredDonations],
  );
  const missingScreenshotCount = useMemo(
    () => filteredDonations.filter((item) => !item.screenshotUrl).length,
    [filteredDonations],
  );
  const selectedAmount = useMemo(
    () =>
      filteredDonations
        .filter((item) => selectedIds.includes(item.id))
        .reduce((sum, item) => sum + item.amount, 0),
    [filteredDonations, selectedIds],
  );
  const allSelected = filteredDonations.length > 0 && selectedIds.length === filteredDonations.length;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredDonations.map((item) => item.id));
      return;
    }
    setSelectedIds([]);
  };

  const toggleSelectOne = (donationId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(donationId) ? prev : [...prev, donationId];
      }
      return prev.filter((id) => id !== donationId);
    });
  };

  const handleBulkVerify = async () => {
    const targetDonations = filteredDonations.filter(
      (item) =>
        selectedIds.includes(item.id)
        && item.donationStatus === 'PENDING',
    );

    if (targetDonations.length === 0) {
      toast.error('Select at least one pending donation to verify');
      return;
    }

    setIsBulkVerifying(true);
    try {
      const results = await Promise.allSettled(
        targetDonations.map((donation) =>
          donationsService.approvePending(donation.id, {
            manualConfirm: true,
            verificationNote: 'Bulk manual verification by admin.',
          }),
        ),
      );
      const verifiedCount = results.filter((result) => result.status === 'fulfilled').length;
      const verifiedIds = new Set(
        results
          .filter((result): result is PromiseFulfilledResult<Donation> => result.status === 'fulfilled')
          .map((result) => result.value.id),
      );
      const totalAmountVerified = targetDonations
        .filter((donation) => verifiedIds.has(donation.id))
        .reduce((sum, donation) => sum + donation.amount, 0);

      toast.success(`${verifiedCount} donations verified (INR ${totalAmountVerified.toFixed(2)})`);
      setSelectedIds([]);
      await refreshDonationQueries();
      await invalidateMoneyQueries(queryClient);
      await fetchPending();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to bulk verify donations'));
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const handleBulkReject = async () => {
    const targetDonations = filteredDonations.filter(
      (item) =>
        selectedIds.includes(item.id)
        && item.donationStatus === 'PENDING',
    );

    if (targetDonations.length === 0) {
      toast.error('Select at least one pending donation to reject');
      return;
    }

    setIsBulkRejecting(true);
    try {
      const results = await Promise.allSettled(
        targetDonations.map((donation) => donationsService.rejectPending(donation.id)),
      );
      const rejectedCount = results.filter((result) => result.status === 'fulfilled').length;
      toast.success(`${rejectedCount} donations rejected`);
      setSelectedIds([]);
      await refreshDonationQueries();
      await invalidateMoneyQueries(queryClient);
      await fetchPending();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to bulk reject donations'));
    } finally {
      setIsBulkRejecting(false);
    }
  };

  const handleCopyTransactionId = async (value?: string) => {
    if (!value) {
      toast.error('No transaction ID available');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success('UTR copied');
    } catch {
      toast.error('Failed to copy UTR');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Donations"
        description="Review pending UPI donations before they affect fund balances"
        backHref="/dashboard/donations"
        backLabel="Back to Donations"
      >
        <Button
          onClick={handleBulkVerify}
          disabled={selectedIds.length === 0 || isBulkVerifying || isBulkRejecting}
        >
          {isBulkVerifying ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Verify Selected ({selectedIds.length})
        </Button>
        <Button
          variant="outline"
          onClick={handleBulkReject}
          disabled={selectedIds.length === 0 || isBulkVerifying || isBulkRejecting}
        >
          {isBulkRejecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Reject Selected ({selectedIds.length})
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/donations">All Donations</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/80">Pending Donations</CardTitle>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Clock3 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold leading-none">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Requires verification</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/80">Open Amount</CardTitle>
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold leading-none">INR {pendingTotalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/80">Missing UTR</CardTitle>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <CircleAlert className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold leading-none">{missingTransactionCount}</p>
            <p className="text-xs text-muted-foreground">Unpaid proof missing</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foreground/80">Missing Screenshot</CardTitle>
            <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-bold leading-none">{missingScreenshotCount}</p>
            <p className="text-xs text-muted-foreground">Needs donor follow-up</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setStatusFilter('ALL');
            setSelectedIds([]);
          }}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setStatusFilter('PENDING');
            setSelectedIds([]);
          }}
        >
          PENDING
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="ds-stack pt-6">
          <div className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
              />
              <span className="text-sm text-muted-foreground">Select all pending donations</span>
            </div>
            <div className="text-sm font-medium text-foreground">
              Selected amount: INR {selectedAmount.toFixed(2)}
            </div>
          </div>

          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
              <div className="h-16 rounded-xl bg-muted" />
            </div>
          ) : filteredDonations.length === 0 ? (
            <div className="rounded-xl border-0 p-0">
              <ListEmptyState
                title="No pending donations"
                description="All pending donations are cleared."
                actionLabel="Refresh"
                onAction={fetchPending}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDonations.map((donation) => {
                const isProcessing = processingId === donation.id;
                const waLink = toWaLink(donation.donorPhone);
                const proofUrl = donation.screenshotUrl ?? null;
                const canReview =
                  donation.donationStatus === 'PENDING'
                  && (isAdmin || isSuperAdmin);

                return (
                  <div
                    key={donation.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.includes(donation.id)}
                          onCheckedChange={(checked) =>
                            toggleSelectOne(donation.id, Boolean(checked))
                          }
                        />
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-base font-semibold text-foreground">{donation.donorName?.trim() || 'Anonymous'}</p>
                            <p className="font-semibold text-foreground">INR {donation.amount.toFixed(2)}</p>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">{formatDate(donation.createdAt)}</p>
                            <Badge variant="outline" className="text-xs">{donation.donationStatus}</Badge>
                          </div>

                          <p className="text-xs text-gray-500">{donation.fund?.type}</p>

                          <p className="text-sm truncate text-muted-foreground">
                            Added by: {donation.createdByName ?? 'Unknown'}
                            {donation.createdByRole ? ` (${donation.createdByRole.toLowerCase()})` : ''}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Fund: {donation.fund?.name || donation.fund?.type || 'N/A'}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Phone: {donation.donorPhone || 'N/A'}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Intent: {donation.intentId}
                          </p>

                          {donation.donationStatus === 'VERIFIED' ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/donate/receipt/${donation.intentId}`}>View Receipt</Link>
                            </Button>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                              UTR: {donation.upiTransactionId || 'Not provided'}
                            </span>
                            {donation.upiTransactionId ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyTransactionId(donation.upiTransactionId)}
                              >
                                <Copy className="mr-1 h-3.5 w-3.5" />
                                Copy UTR
                              </Button>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {proofUrl && proofUrl.startsWith('http') ? (
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="inline-flex h-auto items-center p-0 text-primary"
                                onClick={() => {
                                  setPreviewScale(1);
                                  setPreviewUrl(proofUrl);
                                }}
                              >
                                View Proof
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">Screenshot not uploaded</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {canReview ? (
                          <>
                            <Button
                              size="sm"
                              disabled={isProcessing || isBulkVerifying}
                              onClick={() => {
                                setVerifyTarget(donation);
                                setVerifyTransactionId(donation.upiTransactionId ?? '');
                                setVerificationNote(donation.verificationNote ?? '');
                                setManualConfirm(false);
                                setIntentMatchedViaReconciliation(false);
                              }}
                            >
                              {isProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              Verify
                            </Button>
                            <ActionOverflowMenu
                              items={[
                                ...(waLink
                                  ? [{ label: 'Open WhatsApp', onSelect: () => router.push(waLink) }]
                                  : []),
                                {
                                  label: 'Send WhatsApp Reminder',
                                  onSelect: () => handleManualReminder(donation.id),
                                  disabled: isProcessing || isBulkVerifying,
                                },
                                {
                                  label: 'Reject',
                                  onSelect: () => handleReject(donation.id),
                                  destructive: true,
                                  disabled: isProcessing || isBulkVerifying,
                                },
                              ]}
                            />
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewUrl(null)}>
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setPreviewScale((v) => Math.max(0.5, v - 0.25))}>
                -
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setPreviewScale((v) => Math.min(3, v + 0.25))}>
                +
              </Button>
              <ActionOverflowMenu
                align="start"
                items={[{ label: 'Reset Zoom', onSelect: () => setPreviewScale(1) }]}
              />
            </div>
            <img
              src={previewUrl}
              alt="Screenshot preview"
              className="max-h-[85vh] max-w-[90vw] rounded-xl border border-white/20 object-contain"
              style={{ transform: `scale(${previewScale})` }}
            />
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(verifyTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVerifyTarget(null);
            setVerifyTransactionId('');
            setVerificationNote('');
            setManualConfirm(false);
            setIntentMatchedViaReconciliation(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Donation</DialogTitle>
            <DialogDescription>
              Select available evidence. Manual confirmation is required only when no proof is available.
            </DialogDescription>
          </DialogHeader>

          <div className="ds-stack">
            <div className="space-y-2">
              <Label>Evidence Options</Label>
              <div className="space-y-2 rounded-xl border border-border p-3">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={Boolean(verifyTarget?.screenshotUrl)} disabled />
                  Screenshot verified
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={Boolean(verifyTransactionId.trim() || verifyTarget?.upiTransactionId?.trim())} disabled />
                  UTR verified
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={intentMatchedViaReconciliation}
                    onCheckedChange={(v) => setIntentMatchedViaReconciliation(Boolean(v))}
                  />
                  Intent ID matched via reconciliation
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={manualConfirm} onCheckedChange={(v) => setManualConfirm(Boolean(v))} />
                  Manual verification (bank statement checked)
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-upi-id">UTR (Optional)</Label>
              <Input
                id="verify-upi-id"
                value={verifyTransactionId}
                onChange={(e) => setVerifyTransactionId(e.target.value)}
                placeholder="Enter UTR"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-note">Verification Note (Optional)</Label>
              <Textarea
                id="verify-note"
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                rows={3}
                placeholder="Add a manual verification note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={Boolean(processingId)}>
              {processingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
