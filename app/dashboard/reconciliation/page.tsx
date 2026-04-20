'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, Loader2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  reconciliationService,
  type ReconciliationNeedsReviewRow,
  type ReconciliationUploadResult,
} from '@/services/reconciliation.service';
import { donationsService } from '@/services/donations.service';
import { getErrorMessage } from '@/src/utils/error';
import { invalidateMoneyQueries } from '@/lib/money-cache';
import { useAuthStore } from '@/src/store/auth.store';
import { usePermission } from '@/hooks/usePermission';

function reasonLabel(reason: ReconciliationNeedsReviewRow['reason']): string {
  switch (reason) {
    case 'DUPLICATE_BANK_ENTRY':
      return 'Duplicate bank entries';
    case 'INTENT_BELONGS_TO_ANOTHER_MOSQUE':
      return 'Intent belongs to another mosque';
    case 'DUPLICATE_OR_INVALID_INTENT_ID':
      return 'Duplicate or invalid intent ID';
    case 'ALREADY_VERIFIED':
      return 'Donation already verified';
    case 'STATUS_NOT_ELIGIBLE':
      return 'Donation status not eligible';
    case 'AMOUNT_MISMATCH':
      return 'Amount mismatch';
    case 'STATUS_CHANGED':
      return 'Donation status changed';
    default:
      return reason;
  }
}

export default function ReconciliationPage() {
  const queryClient = useQueryClient();
  const { user, mosque } = useAuthStore();
  const { canCreate, canEdit } = usePermission(user?.role);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [isManualReconciling, setIsManualReconciling] = useState(false);
  const [manualIntentId, setManualIntentId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReference, setManualReference] = useState('');
  const [result, setResult] = useState<ReconciliationUploadResult | null>(null);

  const reviewRows = useMemo(() => result?.needsReviewRows ?? [], [result]);

  const runReconciliation = async (file: File, successMessage: string) => {
    const response = await reconciliationService.uploadCsv(file);
    setResult(response);
    await invalidateMoneyQueries(queryClient, mosque?.id);
    toast.success(successMessage);
  };

  const handleUpload = async (file: File | null) => {
    if (!canCreate) return;
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only .csv files are supported.');
      return;
    }

    setIsUploading(true);
    try {
      await runReconciliation(file, 'Reconciliation completed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to upload reconciliation CSV'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateTestCsv = async () => {
    setIsGeneratingCsv(true);
    try {
      const response = await donationsService.getAll({ page: 1, limit: 50 });
      if (response.data.length === 0) {
        toast.error('No donations available to generate test CSV');
        return;
      }

      const header = 'date,amount,note,reference';
      const rows = response.data.map((donation, index) => {
        const date = new Date(donation.createdAt).toISOString().slice(0, 10);
        const amount = donation.amount.toFixed(2);
        const note = donation.intentId;
        const reference = donation.upiTransactionId || `TEST-REF-${String(index + 1).padStart(3, '0')}`;
        return `${date},${amount},${note},${reference}`;
      });

      const content = [header, ...rows].join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reconciliation-test-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Test CSV generated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to generate test CSV'));
    } finally {
      setIsGeneratingCsv(false);
    }
  };

  const handleManualReconciliation = async () => {
    if (!canEdit) return;

    const intentId = manualIntentId.trim().toUpperCase();
    const amountValue = Number.parseFloat(manualAmount.trim());
    const reference = manualReference.trim();

    if (!intentId) {
      toast.error('Intent ID is required');
      return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setIsManualReconciling(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const csv = [
        'date,amount,note,reference',
        `${date},${amountValue.toFixed(2)},${intentId},${reference || 'MANUAL-ENTRY'}`,
      ].join('\n');

      const file = new File([csv], `manual-reconciliation-${Date.now()}.csv`, { type: 'text/csv' });
      await runReconciliation(file, 'Manual reconciliation completed');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify manual reconciliation entry'));
    } finally {
      setIsManualReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reconciliation"
        description="Upload bank CSV to safely auto-verify eligible donations"
      >
        <Button
          variant="secondary"
          onClick={handleGenerateTestCsv}
          disabled={isGeneratingCsv}
        >
          {isGeneratingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Generate Test CSV
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/donations/pending">Pending Donations</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Upload Bank CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="file"
            accept=".csv,text/csv"
            disabled={!canCreate}
            onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-muted-foreground">
            Expected columns include Date, Amount, Note, Reference. Note column aliases supported: note,
            description, narration, remarks.
          </p>
          <Button disabled={isUploading || !canCreate}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Statement
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Reconciliation Entry</CardTitle>
        </CardHeader>
        <CardContent className="ds-stack">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="manual-intent-id">Intent ID</Label>
              <Input
                id="manual-intent-id"
                placeholder="MLD-2026-A1B2C"
                value={manualIntentId}
                onChange={(e) => setManualIntentId(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-amount">Amount</Label>
              <Input
                id="manual-amount"
                inputMode="decimal"
                placeholder="250.00"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-reference">Reference</Label>
              <Input
                id="manual-reference"
                placeholder="BANK-REF-123"
                value={manualReference}
                onChange={(e) => setManualReference(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <Button onClick={handleManualReconciliation} disabled={isManualReconciling || !canEdit}>
              {isManualReconciling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify Donation
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Auto Verified</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{result?.autoVerified ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Needs Review</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{result?.needsReview ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Unmatched</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{result?.unmatched ?? 0}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rows Requiring Manual Review</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewRows.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No rows require manual review.</div>
          ) : (
            <div className="space-y-3">
              {reviewRows.map((row) => (
                <div key={`${row.csvRowIndex}-${row.intentId}`} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{row.intentId}</p>
                      <p className="text-sm text-muted-foreground">
                        Row {row.csvRowIndex} | INR {row.amount.toFixed(2)}
                        {row.expectedAmount !== undefined ? ` | Expected INR ${row.expectedAmount.toFixed(2)}` : ''}
                      </p>
                      {row.reference ? (
                        <p className="text-xs text-muted-foreground">Reference: {row.reference}</p>
                      ) : null}
                      {row.note ? (
                        <p className="text-xs text-muted-foreground">Note: {row.note}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <Badge variant="secondary">{row.reasonMessage || reasonLabel(row.reason)}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
