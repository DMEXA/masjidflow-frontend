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
import { MuqtadiProfileSkeleton } from '@/components/common/loading-skeletons';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/store/auth.store';
import { queryKeys } from '@/lib/query-keys';

export default function MuqtadiProfilePage() {
  const queryClient = useQueryClient();
  const { user, mosque } = useAuthStore();
  const profileQuery = useProfileQuery();
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    fatherName: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    householdMembers: 0,
    dependentNames: [] as string[],
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    const dependents = Array.isArray(profileQuery.data.dependentNames)
      ? profileQuery.data.dependentNames
      : Array.isArray(profileQuery.data.memberNames)
        ? profileQuery.data.memberNames.slice(1)
        : [];

    setProfile({
      name: profileQuery.data.name,
      fatherName: profileQuery.data.fatherName || '',
      email: profileQuery.data.email || '',
      phone: profileQuery.data.phone || '',
      whatsappNumber: profileQuery.data.whatsappNumber || '',
      householdMembers: profileQuery.data.householdMembers,
      dependentNames: dependents,
    });
  }, [profileQuery.data]);

  useEffect(() => {
    if (!profileQuery.error) {
      return;
    }

    toast.error(getErrorMessage(profileQuery.error, 'Failed to load profile'));
  }, [profileQuery.error]);

  const onSave = async () => {
    const current = profileQuery.data;
    if (!current) return;

    const payload: {
      name?: string;
      fatherName?: string;
      phone?: string;
      whatsappNumber?: string;
      email?: string;
      dependentNames?: string[];
    } = {};

    if (profile.name.trim() !== (current.name || '').trim()) {
      payload.name = profile.name.trim();
    }
    if (profile.fatherName.trim() !== (current.fatherName || '').trim()) {
      payload.fatherName = profile.fatherName.trim();
    }
    if (profile.phone.trim() !== (current.phone || '').trim()) {
      payload.phone = profile.phone.trim();
    }
    if (profile.whatsappNumber.trim() !== (current.whatsappNumber || '').trim()) {
      payload.whatsappNumber = profile.whatsappNumber.trim();
    }
    if (profile.email.trim() !== (current.email || '').trim()) {
      payload.email = profile.email.trim();
    }

    const normalizedDependents = profile.dependentNames.map((name) => name.trim());
    const currentDependents = (Array.isArray(current.dependentNames) ? current.dependentNames : []).map((name) => (name || '').trim());
    if (JSON.stringify(normalizedDependents) !== JSON.stringify(currentDependents)) {
      payload.dependentNames = normalizedDependents;
    }

    if (!Object.keys(payload).length) {
      toast.info('No profile changes to save');
      return;
    }

    setSubmitting(true);
    try {
      await muqtadisService.updateMyProfile(payload);
      toast.success('Profile updated');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiProfile(user?.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.muqtadiDashboard(mosque?.id) }),
      ]);
      await profileQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    } finally {
      setSubmitting(false);
    }
  };

  if (profileQuery.isLoading) {
    return <MuqtadiProfileSkeleton />;
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
            Household size and contribution structure are locked after submission.
          </div>

        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={profile.name} onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))} />
        </div>

        <div className="space-y-2">
          <Label>Father Name</Label>
          <Input
            value={profile.fatherName}
            onChange={(e) => setProfile((prev) => ({ ...prev, fatherName: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} />
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

        <div className="space-y-2">
          <Label>WhatsApp</Label>
          <Input
            value={profile.whatsappNumber}
            onChange={(e) => setProfile((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Dependent Names</Label>
          {profile.dependentNames.length ? (
            <div className="space-y-2">
              {profile.dependentNames.map((name, index) => (
                <Input
                  key={`dependent-${index}`}
                  value={name}
                  onChange={(e) => {
                    const next = [...profile.dependentNames];
                    next[index] = e.target.value;
                    setProfile((prev) => ({ ...prev, dependentNames: next }));
                  }}
                  placeholder={`Dependent ${index + 1}`}
                />
              ))}
            </div>
          ) : (
            <Input value="No dependents" disabled />
          )}
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
