'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DonateEntryPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-b from-emerald-50 via-white to-amber-50 px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Open Mosque Donation Page</CardTitle>
          <CardDescription>
            Permanent QR codes should point to /donate/mosque-slug.
          </CardDescription>
        </CardHeader>
        <CardContent className="ds-stack">
          <div className="space-y-2">
            <Label htmlFor="mosqueSlug">Mosque Slug</Label>
            <Input
              id="mosqueSlug"
              placeholder="example: demo-masjid"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <Button
            onClick={() => router.push(`/donate/${slug.trim()}`)}
            disabled={!slug.trim()}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
