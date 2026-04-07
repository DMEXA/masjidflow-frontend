'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MuqtadiBackButton } from '@/components/muqtadi/back-button';
import { muqtadisService } from '@/services/muqtadis.service';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { getErrorMessage } from '@/src/utils/error';

export default function MuqtadiProfilePage() {
  const profileQuery = useProfileQuery();
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    householdMembers: 0,
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    setProfile({
      name: profileQuery.data.name,
      phone: profileQuery.data.phone || '',
      householdMembers: profileQuery.data.householdMembers,
    });
  }, [profileQuery.data]);

  useEffect(() => {
    if (!profileQuery.error) {
      return;
    }

    toast.error(getErrorMessage(profileQuery.error, 'Failed to load profile'));
  }, [profileQuery.error]);

  const onSave = async () => {
    setSubmitting(true);
    try {
      await muqtadisService.updateMyProfile({
        name: profile.name,
        phone: profile.phone,
      });
      toast.success('Profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setSubmitting(false);
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
        <div className="h-16 rounded-xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="ds-stack">
      <div className="rounded-xl border border-[#d8e5ce] bg-[#f6faf2] p-3">
        <MuqtadiBackButton />
      </div>

      <Card className="border-[#d8e5ce]">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border bg-[#f6faf2] p-3 text-xs text-muted-foreground">
            Household Members are managed by admin.
          </div>

        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} />
        </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Household Members</Label>
            <Input value={String(profile.householdMembers)} disabled />
          </div>
          </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
        </div>

          <Button onClick={onSave} disabled={submitting} className="w-full ">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
