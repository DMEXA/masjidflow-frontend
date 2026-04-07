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
import type { AxiosError } from 'axios';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Mosque Info
    mosqueName: '',
    mosqueAddress: '',
    mosqueCity: '',
    mosqueState: '',
    mosqueCountry: 'India',
    // Admin Info
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      if (!formData.mosqueName || !formData.mosqueAddress || !formData.mosqueCity || !formData.mosqueState) {
        toast.error('Please fill in all mosque details');
        return;
      }
      setStep(2);
      return;
    }

    if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      toast.error('Please fill in all admin details');
      return;
    }

    if (formData.adminPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setShowResendVerification(false);
    try {
      const response = await authService.register(formData);
      if (response.requiresEmailVerification) {
        if (response.emailDeliveryFailed) {
          toast.warning(
            response.message ||
              'Account created, but email could not be sent. Please click "Resend Verification Email".',
          );
          setShowResendVerification(true);
          return;
        }

        toast.success(
          response.message || 'Registration successful. Please verify your email before logging in.',
        );
        router.push(`/login?email=${encodeURIComponent(formData.adminEmail)}`);
        return;
      }

      if (!response.user || !response.mosque || !response.accessToken) {
        throw new Error('Invalid register response');
      }

      setAuth(response.user, response.mosque, response.accessToken);
      toast.success('Registration successful! Welcome to MasjidFlow.');
      router.push('/dashboard');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string | string[] }>;
      const status = axiosError.response?.status;
      if (status === 409) {
        toast.error('This email is already registered. Please login instead.');
      } else if (status === 400) {
        toast.error(getErrorMessage(error, 'Please check the entered details.'));
      } else if (status && status >= 500) {
        toast.error('Registration failed. Please try again.');
      } else {
        toast.error(getErrorMessage(error, 'Registration failed. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    setIsResendingEmail(true);
    try {
      const response = await authService.resendVerificationEmail(formData.adminEmail);
      toast.success(response.message || 'Verification email resent successfully.');
      setShowResendVerification(false);
      router.push(`/login?email=${encodeURIComponent(formData.adminEmail)}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to resend verification email. Please try again later.'));
    } finally {
      setIsResendingEmail(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg">
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
            <CardTitle className="text-2xl text-foreground">Register Your Mosque</CardTitle>
            <CardDescription className="text-muted-foreground">
              {step === 1 ? 'Enter your mosque details' : 'Create your admin account'}
            </CardDescription>
            {/* Step Indicator */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className={`h-2 w-12 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-2 w-12 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          </CardHeader>
          <CardContent>
            {showResendVerification && (
              <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  Account created, but email could not be sent. Please click "Resend Verification Email".
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={handleResendVerificationEmail}
                  disabled={isResendingEmail || isLoading}
                >
                  {isResendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    'Resend Verification Email'
                  )}
                </Button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="ds-stack">
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="mosqueName" className="text-sm font-medium text-foreground">
                      Mosque Name
                    </label>
                    <Input
                      id="mosqueName"
                      placeholder="e.g., Jamia Masjid"
                      value={formData.mosqueName}
                      onChange={(e) => setFormData({ ...formData, mosqueName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="mosqueAddress" className="text-sm font-medium text-foreground">
                      Address
                    </label>
                    <Input
                      id="mosqueAddress"
                      placeholder="Full street address"
                      value={formData.mosqueAddress}
                      onChange={(e) => setFormData({ ...formData, mosqueAddress: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="mosqueCity" className="text-sm font-medium text-foreground">
                        City
                      </label>
                      <Input
                        id="mosqueCity"
                        placeholder="City"
                        value={formData.mosqueCity}
                        onChange={(e) => setFormData({ ...formData, mosqueCity: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="mosqueState" className="text-sm font-medium text-foreground">
                        State
                      </label>
                      <Input
                        id="mosqueState"
                        placeholder="State"
                        value={formData.mosqueState}
                        onChange={(e) => setFormData({ ...formData, mosqueState: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="mosqueCountry" className="text-sm font-medium text-foreground">
                      Country
                    </label>
                    <Input
                      id="mosqueCountry"
                      placeholder="Country"
                      value={formData.mosqueCountry}
                      onChange={(e) => setFormData({ ...formData, mosqueCountry: e.target.value })}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="adminName" className="text-sm font-medium text-foreground">
                      Your Name
                    </label>
                    <Input
                      id="adminName"
                      placeholder="Full name"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="adminEmail" className="text-sm font-medium text-foreground">
                      Email
                    </label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@mosque.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="adminPhone" className="text-sm font-medium text-foreground">
                      Phone (Optional)
                    </label>
                    <Input
                      id="adminPhone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.adminPhone}
                      onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="adminPassword" className="text-sm font-medium text-foreground">
                      Password
                    </label>
                    <Input
                      id="adminPassword"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      disabled={isLoading}
                      required
                    />
                  </div>
                </>
              )}
              
              <div className="flex gap-4 pt-2">
                {step === 2 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : step === 1 ? (
                    'Continue'
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          By registering, you agree to our{' '}
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

