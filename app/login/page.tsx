'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/src/store/auth.store';
import { markTwoFactorPending } from '@/services/auth-session';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<'none' | 'email-otp' | 'totp'>('none');
  const [challengeToken, setChallengeToken] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    verificationCode: '',
  });

  const resolvePostLoginPath = (user?: {
    role?: string;
    isPlatformAdmin?: boolean;
    mosqueId?: string | null;
  }) => {
    if (user?.role === 'muqtadi') return '/app/dashboard';
    if (user?.isPlatformAdmin && !user?.mosqueId) return '/platform';
    return '/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
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
        router.push(resolvePostLoginPath(response.user));
        return;
      }

      const response = await authService.login({
        email: formData.email,
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
        router.push(resolvePostLoginPath(response.user));
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
      toast.error(getErrorMessage(error, 'Invalid email or password'));
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
            <form onSubmit={handleSubmit} className="ds-stack">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mosque.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

