'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicHeader } from '@/components/public/header';
import { PublicFooter } from '@/components/public/footer';
import { Building2, MapPin, Heart } from 'lucide-react';
import { mosqueService } from '@/services/mosque.service';

interface MosquePublicInfo {
  name: string;
  address: string;
  city: string;
  description?: string;
  logo?: string;
}

export default function PublicMosquePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [mosque, setMosque] = useState<MosquePublicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMosque() {
      try {
        const data = await mosqueService.getPublicInfo(slug);
        setMosque(data);
      } catch {
        setError('Mosque not found');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMosque();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl animate-pulse space-y-4 px-4 py-10">
        <div className="h-14 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
        <div className="h-32 rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !mosque) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center">
          <Card className="mx-4 w-full max-w-md text-center">
            <CardHeader>
              <CardTitle className="text-foreground">Mosque Not Found</CardTitle>
              <CardDescription className="text-muted-foreground">
                The mosque you&apos;re looking for doesn&apos;t exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/">Go Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mb-8 flex justify-center">
              {mosque.logo ? (
                <img
                  src={mosque.logo}
                  alt={mosque.name}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>
            <h1 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">
              {mosque.name}
            </h1>
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{mosque.address}, {mosque.city}</span>
            </div>
            {mosque.description && (
              <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
                {mosque.description}
              </p>
            )}
          </div>
        </section>

        {/* Donation Section */}
        <section className="py-16">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <Card className="border-border">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl text-foreground">Support This Mosque</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your contributions help maintain and improve our community space
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-6 text-sm text-muted-foreground">
                  Online donations coming soon. Please visit the mosque to make a donation 
                  or contact the administration for bank transfer details.
                </p>
                <div className="rounded-lg bg-muted/50 p-6">
                  <p className="text-sm text-muted-foreground">
                    For donation inquiries, please contact:
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    admin@{slug}.mosque.org
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Info Section */}
        <section className="border-t border-border bg-muted/30 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground">
              Powered by MasjidFlow
            </h2>
            <p className="mt-4 text-muted-foreground">
              This mosque uses MasjidFlow for transparent financial management. 
              Want the same for your mosque?
            </p>
            <div className="mt-8">
              <Button asChild>
                <Link href="/register">Register Your Mosque</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

