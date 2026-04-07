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
import { getErrorMessage } from '@/src/utils/error';
import { clearTwoFactorPending } from '@/services/auth-session';

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [setupToken, setSetupToken] = useState('');

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      try {
        if (typeof window === 'undefined') {
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const nextUserId = params.get('userId') ?? '';
        const nextSetupToken = params.get('setupToken') ?? '';
        if (!nextUserId || !nextSetupToken) {
          toast.error('Missing user context. Please login again.');
          router.replace('/login');
          return;
        }
        setUserId(nextUserId);
        setSetupToken(nextSetupToken);

        const setup = await authService.setupTwoFactor(nextUserId, nextSetupToken);
        if (!active) return;

        setQrCode(setup.qrCode ?? null);
        setManualCode(setup.manualCode ?? '');
      } catch (error) {
        if (!active) return;
        toast.error(getErrorMessage(error, 'Unable to start 2FA setup. Please login again.'));
        router.replace('/login');
      } finally {
        if (active) setIsBootstrapping(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !setupToken) {
      toast.error('Missing user context. Please login again.');
      router.replace('/login');
      return;
    }

    if (!token.trim()) {
      toast.error('Enter your 6-digit OTP code');
      return;
    }

    setIsVerifying(true);
    try {
      const result = await authService.verifyTwoFactor(userId, token.trim());
      clearTwoFactorPending();
      toast.success(result.message || '2FA setup complete. Please login again.');
      router.replace('/');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to verify OTP code'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Scan the QR in your authenticator app, then verify with a 6-digit code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBootstrapping ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing 2FA setup...
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              {qrCode ? (
                <div className="rounded-lg border bg-white p-4">
                  <img src={qrCode} alt="2FA QR Code" className="mx-auto h-52 w-52" />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Manual Code</Label>
                <div className="rounded-md border bg-muted/40 p-3 font-mono text-sm break-all">
                  {manualCode || 'No manual code available'}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={isVerifying}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify and Continue'
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          You must complete this once before platform admin access is granted.
        </CardFooter>
      </Card>
    </div>
  );
}
