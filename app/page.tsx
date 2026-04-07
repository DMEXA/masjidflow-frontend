"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicHeader } from '@/components/public/header';
import { PublicFooter } from '@/components/public/footer';
import { useAuthStore } from '@/src/store/auth.store';
import { AuthLoadingScreen } from '@/components/common/auth-loading-screen';
import { 
  HandCoins, 
  Receipt, 
  Users, 
  BarChart3, 
  Shield, 
  Clock,
  ArrowRight,
  CheckCircle2,
  Building2
} from 'lucide-react';

const features = [
  {
    icon: HandCoins,
    title: 'Donation Management',
    description: 'Track all donations with detailed records. Support multiple payment types including cash, bank transfer, UPI, and online payments.',
  },
  {
    icon: Receipt,
    title: 'Expense Tracking',
    description: 'Manage mosque expenses by category. Upload receipts and maintain complete financial transparency.',
  },
  {
    icon: Users,
    title: 'Member Management',
    description: 'Invite and manage team members with role-based access. Assign Super Admin, Admin, Treasurer, or Viewer roles.',
  },
  {
    icon: BarChart3,
    title: 'Financial Reports',
    description: 'Generate comprehensive reports with visual charts. Export data in PDF or CSV format for record keeping.',
  },
  {
    icon: Shield,
    title: 'Audit Logs',
    description: 'Complete audit trail of all actions. Know who did what and when for full accountability.',
  },
  {
    icon: Clock,
    title: 'Real-time Updates',
    description: 'Access your financial data anytime, anywhere. Dashboard updates in real-time as transactions occur.',
  },
];

const stats = [
  { value: '500+', label: 'Mosques Registered' },
  { value: '₹10Cr+', label: 'Donations Tracked' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Support' },
];

export default function HomePage() {
  const router = useRouter();
  const authStatus = useAuthStore((state) => state.authStatus);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [authStatus, router]);

  if (authStatus === 'loading') {
    return <AuthLoadingScreen message="Checking your session..." />;
  }

  if (authStatus === 'authenticated') {
    return <AuthLoadingScreen message="Redirecting to dashboard..." />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-background py-20 sm:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px]" />
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-77.5 w-77.5 rounded-full bg-primary/20 blur-[100px]" />
          </div>
          
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-8 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
                  <span className="flex h-2 w-2 rounded-full bg-primary" />
                  Now with QR code donations
                </div>
              </div>
              
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Modern Financial Management for{' '}
                <span className="text-primary">Mosques</span>
              </h1>
              
              <p className="mt-6 text-pretty text-lg leading-8 text-muted-foreground">
                Simplify your mosque&apos;s financial operations. Track donations, manage expenses, 
                and generate reports with our easy-to-use platform designed specifically for 
                Islamic institutions.
              </p>
              
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  15-day free trial
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-muted/30 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl font-bold text-foreground sm:text-4xl">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need to manage your mosque finances
              </h2>
              <p className="mt-4 text-muted-foreground">
                Our comprehensive platform provides all the tools your mosque needs for 
                transparent and efficient financial management.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border bg-card transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="border-t border-border bg-muted/30 py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Built with the Muslim community in mind
                </h2>
                <p className="mt-6 text-muted-foreground">
                  MasjidFlow was created to address the unique needs of mosques and Islamic 
                  centers. We understand the importance of financial transparency and 
                  accountability in community institutions.
                </p>
                <ul className="mt-8 ds-stack">
                  {[
                    'Designed specifically for mosque operations',
                    'Compliant with Islamic financial principles',
                    'Multi-language support coming soon',
                    'Dedicated support team',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <Button asChild>
                    <Link href="/register">
                      Get Started Today
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-linear-to-br from-primary/20 to-primary/5 p-8">
                  <div className="flex h-full flex-col items-center justify-center">
                    <Building2 className="h-24 w-24 text-primary/40" />
                    <p className="mt-4 text-center text-lg font-medium text-foreground">
                      Trusted by mosques worldwide
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 sm:px-12 sm:py-20">
              <div className="relative mx-auto max-w-2xl text-center">
                <h2 className="text-balance text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
                  Ready to simplify your mosque finances?
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-primary-foreground/80">
                  Join hundreds of mosques already using MasjidFlow. Start your free 
                  15-day trial today - no credit card required.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Button size="lg" variant="secondary" asChild>
                    <Link href="/register">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link href="/pricing">View Pricing</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

