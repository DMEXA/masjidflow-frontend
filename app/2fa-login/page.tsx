'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/src/store/auth.store';
import { getErrorMessage } from '@/src/utils/error';

export default function TwoFactorLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [userId, setUserId] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    setUserId(params.get('userId') ?? '');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      toast.error('Missing user context. Please login again.');
      router.replace('/login');
      return;
    }

    if (!token.trim()) {
      toast.error('Enter your 6-digit OTP code');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authService.loginWithTwoFactor({
        userId,
        token: token.trim(),
      });

      authService.setToken(result.accessToken);
      setAuth(result.user, result.mosque, result.accessToken);

      if (result.user?.isPlatformAdmin && !result.user?.mosqueId) {
        router.replace('/platform');
      } else {
        router.replace('/dashboard');
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Invalid OTP code'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Two-Factor Login</CardTitle>
          <CardDescription>Enter the code from your authenticator app to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Complete Login'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          This step is required for platform admin access.
        </CardFooter>
      </Card>
    </div>
  );
}
