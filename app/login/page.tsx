'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { getErrorMessage } from '@/src/utils/error';
import { authService } from '@/services/auth.service';
import { muqtadisService } from '@/services/muqtadis.service';
import { useAuthStore } from '@/src/store/auth.store';
import { markTwoFactorPending } from '@/services/auth-session';

function LoginPageContent() {
  const RESEND_COOLDOWN_SECONDS = 45;
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const authStatus = useAuthStore((state) => state.authStatus);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUser = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [verificationStep, setVerificationStep] = useState<'none' | 'email-otp' | 'totp'>('none');
  const [challengeToken, setChallengeToken] = useState('');
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    verificationCode: '',
  });

  const resolvePostLoginPath = useCallback(async (user?: {
    role?: string;
    isPlatformAdmin?: boolean;
    mosqueId?: string | null;
  }) => {
    if (user?.role === 'muqtadi') {
      try {
        const profile = await muqtadisService.getMyProfile();
        if (profile?.isVerified === false) {
          return '/household-pending';
        }
      } catch (error) {
        const message = getErrorMessage(error, '');
        if (message === 'Household not verified yet') {
          return '/household-pending';
        }
      }
      return '/app/dashboard';
    }
    if (user?.isPlatformAdmin && !user?.mosqueId) return '/platform';
    return '/dashboard';
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    const redirectAuthenticatedUser = async () => {
      const destination = await resolvePostLoginPath(currentUser ?? undefined);
      if (!cancelled) {
        router.replace(destination);
      }
    };

    void redirectAuthenticatedUser();

    return () => {
      cancelled = true;
    };
  }, [authStatus, isAuthenticated, currentUser, resolvePostLoginPath, router]);

  useEffect(() => {
    const queuedEmail = searchParams.get('unverifiedEmail')?.trim().toLowerCase();
    if (!queuedEmail) {
      return;
    }

    setUnverifiedEmail(queuedEmail);
    setFormData((prev) => ({
      ...prev,
      identifier: prev.identifier || queuedEmail,
    }));

    if (searchParams.get('registrationEmailFailed') === '1') {
      toast.error('Account created, but verification email could not be sent. Please resend below.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  const handleResendVerification = async () => {
    if (!unverifiedEmail) {
      toast.error('Please enter your email to resend verification.');
      return;
    }

    if (resendCooldownSeconds > 0) {
      return;
    }

    setIsResendingVerification(true);
    try {
      const response = await authService.resendVerificationEmail(unverifiedEmail);
      toast.success(response.message || 'Verification email sent.');
      setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to resend verification email right now.'));
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.identifier || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (verificationStep !== 'none') {
        if (!formData.verificationCode.trim()) {
          toast.error('Please enter your 6-digit code');
          return;
        }

        const response =
          verificationStep === 'email-otp'
            ? await authService.verifyEmailOtp({
                challengeToken,
                code: formData.verificationCode.trim(),
              })
            : await authService.verifyTotp({
                challengeToken,
                code: formData.verificationCode.trim(),
              });
        setAuth(response.user, response.mosque, response.accessToken);
        toast.success('Login successful!');
        const destination = await resolvePostLoginPath(response.user);
        router.push(destination);
        return;
      }

      const response = formData.identifier.includes('@')
        ? await authService.login({
            email: formData.identifier,
            password: formData.password,
          })
        : await authService.loginWithPhone({
            phone: formData.identifier,
            password: formData.password,
          });

      if ('requires2FASetup' in response && response.requires2FASetup) {
        markTwoFactorPending();
        router.push(
          `/2fa-setup?userId=${encodeURIComponent(response.userId)}&setupToken=${encodeURIComponent(response.setupToken)}`,
        );
        return;
      }

      if ('requires2FA' in response && response.requires2FA) {
        markTwoFactorPending();
        router.push(`/2fa-login?userId=${encodeURIComponent(response.userId)}`);
        return;
      }

      if ('accessToken' in response) {
        setAuth(response.user, response.mosque, response.accessToken);
        toast.success('Login successful!');
        const destination = await resolvePostLoginPath(response.user);
        router.push(destination);
        return;
      }

      if ('requiresEmailOtp' in response && response.requiresEmailOtp) {
        setVerificationStep('email-otp');
        setChallengeToken(response.challengeToken);
        setFormData((prev) => ({ ...prev, verificationCode: '' }));
        toast.info('Check your email for a 6-digit OTP');
        return;
      }

      if ('requiresTotp' in response && response.requiresTotp) {
        setVerificationStep('totp');
        setChallengeToken(response.challengeToken);
        setFormData((prev) => ({ ...prev, verificationCode: '' }));
        toast.info('Enter your authenticator app code to continue');
        return;
      }

      toast.error('Login response is incomplete. Please try again.');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; code?: string }>;
      const status = axiosError.response?.status;
      const errorCode = axiosError.response?.data?.code;
      const errorMessage = (axiosError.response?.data?.message || '').toLowerCase();
      const identifier = formData.identifier.trim().toLowerCase();

      if (
        status === 403
        && (errorCode === 'UNVERIFIED_ACCOUNT' || errorMessage.includes('not verified'))
        && identifier.includes('@')
      ) {
        setUnverifiedEmail(identifier);
        toast.error('Your email is not verified yet. You can resend verification below.');
        return;
      }

      toast.error(getErrorMessage(error, 'Invalid phone/email or password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">MasjidFlow</span>
          </Link>
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unverifiedEmail && verificationStep === 'none' && (
              <div className="mb-5 space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Your email isn&apos;t verified yet.</p>
                <p>Check your inbox (and spam folder) for the verification link we sent after registration.</p>
                <p>Didn&apos;t receive it? You can resend the email below.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification || resendCooldownSeconds > 0}
                >
                  {isResendingVerification ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldownSeconds > 0 ? (
                    `Resend verification email (${resendCooldownSeconds}s)`
                  ) : (
                    'Resend verification email'
                  )}
                </Button>
                {resendCooldownSeconds > 0 && (
                  <p className="text-xs text-amber-800/90">Please wait {resendCooldownSeconds}s before requesting another email.</p>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit} className="ds-stack">
              <div className="space-y-2">
                <label htmlFor="identifier" className="text-sm font-medium text-foreground">
                  Phone number or email
                </label>
                <Input
                  id="identifier"
                  type="text"
                  inputMode="tel"
                  placeholder="+91 9876543210"
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                  disabled={isLoading || verificationStep !== 'none'}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading || verificationStep !== 'none'}
                  required
                />
              </div>
              {verificationStep !== 'none' && (
                <div className="space-y-2">
                  <label htmlFor="verificationCode" className="text-sm font-medium text-foreground">
                    {verificationStep === 'email-otp' ? 'Email OTP Code' : 'Authenticator Code'}
                  </label>
                  <Input
                    id="verificationCode"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    value={formData.verificationCode}
                    onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                    disabled={isLoading}
                    maxLength={6}
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  verificationStep === 'none' ? 'Sign In' : 'Verify & Sign In'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Register your mosque
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          By signing in, you agree to our{' '}
          <Link href="#" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="#" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
          <Card className="w-full max-w-md border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">Welcome back</CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading login...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

