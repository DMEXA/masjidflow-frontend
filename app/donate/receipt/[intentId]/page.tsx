'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { donationsService, type PublicDonationReceipt } from '@/services/donations.service';
import { getErrorMessage } from '@/src/utils/error';
import { formatDate } from '@/src/utils/format';
import { API_BASE_URL } from '@/src/constants';

export default function PublicDonationReceiptPage() {
	const params = useParams<{ intentId: string }>();
	const router = useRouter();
	const [receipt, setReceipt] = useState<PublicDonationReceipt | null>(null);
	const [publicDonation, setPublicDonation] = useState<{
		id: string;
		createdAt: string;
		screenshotUrl?: string | null;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const intentId = params.intentId;

	const receiptPdfUrl = useMemo(() => {
		if (!receipt?.intentId) return '';
		return `${API_BASE_URL}${donationsService.getPublicReceiptPdfUrl(receipt.intentId)}`;
	}, [receipt?.intentId]);

	const handleDownloadReceipt = () => {
		if (!receiptPdfUrl) return;
		router.push(receiptPdfUrl);
	};

	useEffect(() => {
		const loadReceipt = async () => {
			setIsLoading(true);
			try {
				const data = await donationsService.getPublicReceipt(intentId);
				setReceipt(data);
				const details = await donationsService.getPublicById(data.donationId);
				setPublicDonation({
					id: details.id,
					createdAt: details.createdAt,
					screenshotUrl: details.screenshotUrl,
				});
			} catch (error) {
				toast.error(getErrorMessage(error, 'Receipt is not available yet.'));
			} finally {
				setIsLoading(false);
			}
		};

		if (intentId) {
			loadReceipt();
		}
	}, [intentId]);

	if (isLoading) {
		return (
			<div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
				<div className="h-8 w-56 animate-pulse rounded bg-muted" />
				<Card>
					<CardHeader className="space-y-3">
						<div className="h-6 w-52 animate-pulse rounded bg-muted" />
						<div className="h-4 w-full animate-pulse rounded bg-muted" />
						<div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
						<div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
						<div className="h-40 w-full animate-pulse rounded bg-muted" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!receipt) {
		return (
			<div className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4">
				<Card className="w-full text-center">
					<CardHeader>
						<CardTitle>Receipt Not Available</CardTitle>
						<CardDescription>
							Receipt is available only after donation verification.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild variant="outline">
							<Link href="/donate">Back to Donate</Link>
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
						<CardTitle>Donation Receipt</CardTitle>
						<CardDescription>Verified donation confirmation</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<div>
								<p className="text-xs text-muted-foreground">Mosque</p>
								<p className="font-medium">{receipt.mosqueName}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Amount</p>
								<p className="font-medium">INR {receipt.amount.toFixed(2)}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Donor</p>
								<p className="font-medium">{receipt.donorName?.trim() || 'Anonymous'}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Fund</p>
								<p className="font-medium">{receipt.fundName}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Donation Date</p>
								<p className="font-medium">{formatDate(publicDonation?.createdAt ?? receipt.donationDate)}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Intent ID</p>
								<p className="font-medium">{receipt.intentId}</p>
							</div>
							<div>
								<p className="text-xs text-muted-foreground">Verification Status</p>
								<Badge>{receipt.verificationStatus}</Badge>
							</div>
						</div>

						{publicDonation?.screenshotUrl ? (
							<div className="rounded-xl border p-3">
								<p className="text-xs text-muted-foreground">Payment Proof</p>
								<a href={publicDonation.screenshotUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">
									View Screenshot
								</a>
							</div>
						) : null}

						<div className="pt-2">
							<Button onClick={handleDownloadReceipt}>
								<Download className="mr-2 h-4 w-4" />
								Download Receipt PDF
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}