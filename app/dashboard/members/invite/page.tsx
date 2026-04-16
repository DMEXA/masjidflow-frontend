'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/src/utils/error';
import { membersService } from '@/services/members.service';
import { USER_ROLES } from '@/src/constants';
import type { UserRole } from '@/src/constants';
import { usePermission } from '@/hooks/usePermission';
import { openExternalUrl } from '@/src/utils/open-external-url';
import { isValidIndianPhone, normalizeIndianPhone } from '@/src/utils/phone';

const INVITABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: USER_ROLES.ADMIN, label: 'Admin' },
  { value: USER_ROLES.TREASURER, label: 'Treasurer' },
  { value: USER_ROLES.VIEWER, label: 'Viewer' },
];

export default function InviteMemberPage() {
  const router = useRouter();
  const { canManageMembers } = usePermission();

  useEffect(() => {
    if (!canManageMembers) {
      router.replace('/dashboard');
    }
  }, [canManageMembers, router]);

  if (!canManageMembers) {
    return null;
  }

  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [formData, setFormData] = useState({
    phone: '',
    role: '' as UserRole | '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isValidIndianPhone(formData.phone)) {
      toast.error('Please enter a valid Indian phone number');
      return;
    }

    const normalizedPhone = normalizeIndianPhone(formData.phone);
    if (!normalizedPhone) {
      toast.error('Please enter a valid Indian phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await membersService.invite({
        phone: normalizedPhone,
        role: formData.role as UserRole,
      });

      const invitePath =
        response.link ||
        response.inviteLink ||
        (response.token ? `/invite/member?token=${encodeURIComponent(response.token)}` : '');

      if (invitePath) {
        const link = invitePath.startsWith('http') ? invitePath : `${window.location.origin}${invitePath}`;
        setInviteLink(link);
      }

      toast.success('Invite link created successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send invitation. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success('Invite link copied');
    } catch {
      toast.error('Failed to copy invite link');
    }
  };

  const handleShareLink = async () => {
    if (!inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Member Invite',
          text: 'You have been invited to join our mosque management system.',
          url: inviteLink,
        });
        return;
      } catch {
        // Fallback to WhatsApp URL if native share is unavailable/cancelled.
      }
    }
    const whatsappUrl = `https://wa.me/?text=You%20have%20been%20invited%20to%20join%20our%20mosque%20management%20system:%20${inviteLink}`;
    openExternalUrl(whatsappUrl);
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Invite Member
          </h1>
          <p className="text-muted-foreground">
            Send an invitation to join your mosque
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Member Details</CardTitle>
              <CardDescription className="text-muted-foreground">
                Send a trusted staff invite for Admin, Treasurer, or Viewer access.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-foreground"
              >
                Phone Number <span className="text-destructive">*</span>
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={isLoading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Trusted invite flow does not require OTP. Phone is required for login.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="role"
                className="text-sm font-medium text-foreground"
              >
                Role <span className="text-destructive">*</span>
              </label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admins can manage all records. Treasurers manage finances.
                Viewers have read-only access.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </form>

          {inviteLink && (
            <div className="mt-6 space-y-3 rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-foreground">
                Link created ✅
              </p>
              <Input value={inviteLink} readOnly />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCopyLink}>
                  Copy
                </Button>
                <Button type="button" className="w-full sm:w-auto" onClick={handleShareLink}>
                  Share
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
