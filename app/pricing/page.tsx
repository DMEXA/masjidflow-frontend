import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicHeader } from '@/components/public/header';
import { PublicFooter } from '@/components/public/footer';
import { Check, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose the perfect plan for your mosque. Start with a free trial and upgrade as you grow.',
};

const plans = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price: '0',
    currency: '₹',
    duration: '15 days',
    description: 'Try MasjidFlow free for 15 days',
    features: [
      'Basic donation tracking',
      'Expense management',
      'Up to 3 team members',
      'Limited reports',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '299',
    currency: '₹',
    duration: 'month',
    description: 'Everything you need for your mosque',
    features: [
      'Unlimited donation tracking',
      'Full expense management',
      'Unlimited team members',
      'Comprehensive reports',
      'Audit logs',
      'Member management',
      'Priority email support',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    id: 'advanced_premium',
    name: 'Advanced Premium',
    price: '399',
    currency: '₹',
    duration: 'month',
    description: 'Advanced features for larger mosques',
    features: [
      'Everything in Premium',
      'QR code donations',
      'Online payment integration',
      'SMS notifications',
      'Multi-branch support',
      'Advanced analytics',
      'Priority phone support',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'Can I try MasjidFlow before purchasing?',
    answer: 'Yes! We offer a 15-day free trial with access to all basic features. No credit card required to start.',
  },
  {
    question: 'Can I upgrade or downgrade my plan later?',
    answer: 'Absolutely. You can change your plan at any time. When upgrading, you\'ll get immediate access to new features. When downgrading, the change takes effect at the end of your billing cycle.',
  },
  {
    question: 'Is there a discount for annual billing?',
    answer: 'Yes, we offer a 20% discount when you choose annual billing. Contact our sales team for more details.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, debit cards, UPI, and bank transfers. For annual plans, we also accept cheque payments.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we take security seriously. All data is encrypted in transit and at rest. We perform regular security audits and comply with industry best practices.',
  },
  {
    question: 'Do you offer support for setting up?',
    answer: 'Yes, our team is available to help you get started. Premium and Advanced Premium plans include dedicated onboarding support.',
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-background py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Simple, transparent pricing
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Choose the plan that works best for your mosque. Start with a free trial 
                and upgrade as your needs grow.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              {plans.map((plan) => (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col ${
                    plan.highlighted 
                      ? 'border-primary shadow-lg ring-1 ring-primary' 
                      : 'border-border'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
                    <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-8 text-center">
                      <span className="text-4xl font-bold text-foreground">{plan.currency}{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.duration}</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={plan.highlighted ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href="/register">{plan.cta}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="border-t border-border bg-muted/30 py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Frequently asked questions
              </h2>
              <p className="mt-4 text-muted-foreground">
                Have more questions? Contact our support team.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="text-base font-semibold text-foreground">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-primary/5 px-6 py-12 text-center sm:px-12">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Ready to get started?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Start your 15-day free trial today. No credit card required.
              </p>
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link href="/register">Start Free Trial</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

