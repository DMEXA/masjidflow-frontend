'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/src/utils/error';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    const emailFromQuery = searchParams.get('email')?.trim().toLowerCase() || '';
    setResendEmail(emailFromQuery);
    if (!token) {
      setStatus('error');
      setMessage('Verification token is missing.');
      return;
    }

    let active = true;
    authService
      .verifyEmail(token)
      .then(() => {
        if (!active) return;
        setStatus('success');
        setMessage('Email verified successfully. You can now log in.');
        setTimeout(() => router.replace('/login?verified=1'), 1200);
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        setMessage(getErrorMessage(error, 'Failed to verify email.'));
      });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      setMessage('Enter your account email to resend verification.');
      return;
    }

    setIsResending(true);
    try {
      const result = await authService.resendVerificationEmail(resendEmail.trim());
      setMessage(result.message || 'Verification email sent.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to resend verification email right now.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md border-border">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Confirming your account security.</CardDescription>
        </CardHeader>
        <CardContent className="ds-stack">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{message}</span>
            </div>
          ) : (
            <p className="text-sm text-foreground">{message}</p>
          )}

          {status !== 'loading' && (
            <>
              {status === 'error' && (
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    disabled={isResending}
                  />
                  <Button type="button" variant="outline" className="w-full" onClick={handleResend} disabled={isResending}>
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Resend Verification Email'
                    )}
                  </Button>
                </div>
              )}

              <Button asChild className="w-full">
                <Link href="/login">Go to Login</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
          <Card className="w-full max-w-md border-border">
            <CardHeader>
              <CardTitle>Email Verification</CardTitle>
              <CardDescription>Confirming your account security.</CardDescription>
            </CardHeader>
            <CardContent className="ds-stack">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying your email...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
