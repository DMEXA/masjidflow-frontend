'use client';

import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';
import { useAuthStore } from '@/src/store/auth.store';
import { getErrorMessage } from '@/src/utils/error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export function SecuritySettings() {
  const fieldClass = 'w-full rounded-xl px-4 py-3';
  const { user, token, setAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  const [securityLoading, setSecurityLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [phoneCorrectionForm, setPhoneCorrectionForm] = useState({
    phone: user?.phone ?? '',
    currentPassword: '',
  });
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(false);

  useEffect(() => {
    setEmailOtpEnabled(Boolean(user?.emailOtpEnabled));
  }, [user?.emailOtpEnabled]);

  useEffect(() => {
    setPhoneCorrectionForm((prev) => ({
      ...prev,
      phone: user?.phone ?? '',
    }));
  }, [user?.phone]);

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Please complete all password fields');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }

    setSecurityLoading(true);
    try {
      const result = await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      toast.success(result.message || 'Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    if (!user?.id) {
      toast.error('User not found');
      return;
    }

    setSecurityLoading(true);
    try {
      const data = await authService.setupTwoFactorAuthenticated();
      setTwoFactorSecret(data.manualCode);
      toast.success('2FA setup created. Enter code from your authenticator app to enable.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to setup two-factor authentication'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    if (!twoFactorCode.trim()) {
      toast.error('Enter your 6-digit authenticator code');
      return;
    }

    setSecurityLoading(true);
    try {
      const result = await authService.enableTwoFactor(twoFactorCode.trim());
      toast.success(result.message || 'Two-factor authentication enabled');
      setTwoFactorCode('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to enable two-factor authentication'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleToggleEmailOtp = async (enabled: boolean) => {
    setSecurityLoading(true);
    try {
      const result = await authService.setEmailOtp(enabled);
      setEmailOtpEnabled(enabled);
      toast.success(result.message || (enabled ? 'Email OTP enabled' : 'Email OTP disabled'));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update Email OTP setting'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    setSecurityLoading(true);
    try {
      const result = await authService.disableTwoFactor();
      setTwoFactorSecret(null);
      setTwoFactorCode('');
      setEmailOtpEnabled(false);
      toast.success(result.message || 'Two-factor authentication disabled');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to disable two-factor authentication'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleCorrectPhone = async () => {
    if (!phoneCorrectionForm.phone.trim() || !phoneCorrectionForm.currentPassword) {
      toast.error('Enter both phone number and current password');
      return;
    }

    setSecurityLoading(true);
    try {
      const result = await usersService.correctMyPhone({
        phone: phoneCorrectionForm.phone.trim(),
        currentPassword: phoneCorrectionForm.currentPassword,
      });

      toast.success(result.message || 'Phone updated successfully');

      if (token) {
        const me = await authService.getCurrentUser();
        setAuth(me.user, me.mosque, token);
      }

      setPhoneCorrectionForm((prev) => ({ ...prev, currentPassword: '' }));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update phone number'));
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleCancel = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPhoneCorrectionForm({ phone: user?.phone ?? '', currentPassword: '' });
    setTwoFactorCode('');
    setIsEditing(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground">Manage your account security</CardDescription>
          </div>
          {!isEditing ? (
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <section className="rounded-xl border bg-muted/30 p-4 text-sm space-y-2">
          <p className="font-medium">Read-only summary</p>
          <p><span className="text-muted-foreground">Phone:</span> {user?.phone || 'Not set'}</p>
          <p><span className="text-muted-foreground">Email:</span> {user?.email || 'Not set'}</p>
          <p><span className="text-muted-foreground">Email OTP:</span> {emailOtpEnabled ? 'Enabled' : 'Disabled'}</p>
        </section>

        <div className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-foreground">Primary Contact</Label>
              <p className="text-sm text-muted-foreground">Phone: {user?.phone || 'Not set'}</p>
            </div>
            <Badge variant={user?.phoneVerified ? 'default' : 'secondary'}>
              {user?.phoneVerified ? 'Phone verified' : 'Phone not verified'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">Email fallback: {user?.email || 'Not set'}</p>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-foreground">Email OTP</Label>
            <p className="text-sm text-muted-foreground">Receive a 6-digit login code on email for second-step verification</p>
          </div>
          <Switch checked={emailOtpEnabled} onCheckedChange={(checked) => void handleToggleEmailOtp(checked)} disabled={securityLoading || !isEditing} />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-foreground">Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" onClick={() => void handleSetupTwoFactor()} disabled={securityLoading || !isEditing} className="rounded-xl">
              {securityLoading ? 'Please wait...' : 'Setup 2FA'}
            </Button>
          </div>

          {twoFactorSecret ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-sm text-muted-foreground">Save this secret in your authenticator app:</p>
              <code className="block break-all rounded bg-background px-3 py-2 text-xs">{twoFactorSecret}</code>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className={fieldClass}
                  placeholder="Enter 6-digit code"
                  value={twoFactorCode}
                  disabled={!isEditing}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                />
                <Button onClick={() => void handleEnableTwoFactor()} disabled={securityLoading || !isEditing}>Enable</Button>
              </div>
            </div>
          ) : null}
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="text-foreground">Change Password</Label>
            <p className="text-sm text-muted-foreground">Update your account password</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              className={fieldClass}
              type="password"
              placeholder="Current password"
              value={passwordForm.currentPassword}
              disabled={!isEditing}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            />
            <Input
              className={fieldClass}
              type="password"
              placeholder="New password"
              value={passwordForm.newPassword}
              disabled={!isEditing}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            />
            <Input
              className={fieldClass}
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              disabled={!isEditing}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => void handleChangePassword()} disabled={securityLoading || !isEditing}>Change Password</Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <Label className="text-foreground">Phone Number</Label>
            <p className="text-sm text-muted-foreground">Update your primary phone contact</p>
            <p className="text-xs text-muted-foreground">You can correct your phone one time with password confirmation.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              className={fieldClass}
              type="tel"
              placeholder="New phone number"
              value={phoneCorrectionForm.phone}
              disabled={!isEditing}
              onChange={(e) => setPhoneCorrectionForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <Input
              className={fieldClass}
              type="password"
              placeholder="Current password"
              value={phoneCorrectionForm.currentPassword}
              disabled={!isEditing}
              onChange={(e) => setPhoneCorrectionForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => void handleCorrectPhone()} disabled={securityLoading || !isEditing}>Save Phone Correction</Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label className="text-foreground">Disable 2FA</Label>
            <p className="text-sm text-muted-foreground">Turn off all second-factor methods (Email OTP and Authenticator)</p>
          </div>
          <Button variant="outline" onClick={() => void handleDisableTwoFactor()} disabled={securityLoading || !isEditing}>Disable 2FA</Button>
        </div>

        {isEditing ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={securityLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setIsEditing(false)} disabled={securityLoading}>
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
