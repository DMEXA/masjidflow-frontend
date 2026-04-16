'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { authService } from '@/services/auth.service';
import { usersService } from '@/services/users.service';
import { mosqueService } from '@/services/mosque.service';
import { useAuthStore } from '@/src/store/auth.store';
import { getErrorMessage } from '@/src/utils/error';
import { formatRole } from '@/src/utils/format';
import { usePermission } from '@/hooks/usePermission';
import { PageSkeleton } from '@/components/common/loading-skeletons';

type ProfileFormState = {
  name: string;
  fatherName: string;
  phone: string;
  email: string;
};

const EMPTY_FORM: ProfileFormState = {
  name: '',
  fatherName: '',
  phone: '',
  email: '',
};

export default function DashboardProfilePage() {
  const router = useRouter();
  const { user, mosque, token, setAuth, isLoading } = useAuthStore();
  const { canManageSettings } = usePermission();

  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [mosqueView, setMosqueView] = useState({
    name: '',
    city: '',
    state: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!user) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: user.name || '',
      fatherName: user.fatherName || '',
      phone: user.phone || '',
      email: user.email || '',
    });
  }, [user]);

  useEffect(() => {
    if (!mosque?.id) {
      setMosqueView({ name: '', city: '', state: '' });
      return;
    }

    let cancelled = false;

    const loadMosque = async () => {
      try {
        const details = await mosqueService.getById(mosque.id);
        if (cancelled) return;
        setMosqueView({
          name: details.name || mosque.name || '',
          city: details.city || '',
          state: details.state || '',
        });
      } catch {
        if (cancelled) return;
        setMosqueView({
          name: mosque.name || '',
          city: mosque.city || '',
          state: mosque.state || '',
        });
      }
    };

    void loadMosque();

    return () => {
      cancelled = true;
    };
  }, [mosque?.id, mosque?.name, mosque?.city, mosque?.state]);

  const hasChanges = useMemo(() => {
    if (!user) return false;
    return (
      form.name.trim() !== (user.name || '').trim()
      || form.fatherName.trim() !== (user.fatherName || '').trim()
      || form.phone.trim() !== (user.phone || '').trim()
      || form.email.trim().toLowerCase() !== (user.email || '').trim().toLowerCase()
    );
  }, [form, user]);

  const handleSaveProfile = async () => {
    if (!user || !mosque) {
      return;
    }

    if (!form.name.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (!hasChanges) {
      toast.info('No profile changes to save');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await usersService.updateMyProfile({
        name: form.name.trim(),
        fatherName: form.fatherName.trim() || null,
        phone: form.phone.trim() || undefined,
        email: form.email.trim().toLowerCase() || undefined,
      });

      if (token) {
        setAuth(
          {
            ...user,
            name: updated.name,
            fatherName: updated.fatherName ?? null,
            email: updated.email,
            phone: updated.phone ?? null,
          },
          mosque,
          token,
        );
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setSavingProfile(false);
    }
  };

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

  if (isLoading || !user || !mosque) {
    return <PageSkeleton rows={1} cardCount={3} />;
  }

  return (
    <div className="ds-stack">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal account details and security.</p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Personal Info</CardTitle>
          <CardDescription>Your own account details only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="staff-name">Full Name</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                disabled={savingProfile}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-father-name">Father&apos;s Name</Label>
              <Input
                id="staff-father-name"
                value={form.fatherName}
                onChange={(e) => setForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                disabled={savingProfile}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="h-10 rounded-md border border-input px-3 py-2">
                <Badge variant="secondary">{formatRole(user.role)}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                disabled={savingProfile}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                disabled={savingProfile}
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={savingProfile || !hasChanges} className="w-full sm:w-auto">
            {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Mosque Info</CardTitle>
          <CardDescription>Read-only unless your role can manage mosque settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={mosqueView.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={mosqueView.city || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={mosqueView.state || ''} disabled />
            </div>
          </div>

          {canManageSettings ? (
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/settings')} className="w-full sm:w-auto">
              Manage Mosque Settings
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                disabled={securityLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                disabled={securityLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                disabled={securityLoading}
              />
            </div>
          </div>

          <Button type="button" variant="outline" onClick={handleChangePassword} disabled={securityLoading} className="w-full sm:w-auto">
            {securityLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* <Card className="border-border">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of your current session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
            Logout
          </Button>
        </CardContent>
      </Card> */}
    </div>
  );
}