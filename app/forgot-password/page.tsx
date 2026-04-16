'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/src/utils/error';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your recovery email address');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.forgotPassword(email.trim());
      toast.success(result.message || 'If that email exists, a reset link has been sent');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send password reset email'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-foreground">Forgot Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Super admin accounts recover password by email reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="ds-stack">
              <Input
                type="email"
                placeholder="admin@mosque.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                If your account was invited by a mosque, contact your admin for a secure reset link.
              </p>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
