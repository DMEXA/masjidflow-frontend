'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { muqtadisService } from '@/services/muqtadis.service';
import { useAuthStore } from '@/src/store/auth.store';
import { getErrorMessage } from '@/src/utils/error';
import { parseStrictIntegerInput } from '@/src/utils/numeric-input';

export default function MuqtadiInvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = String(params?.token || '');

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    name: '',
    fatherName: '',
    whatsappNumber: '',
    householdMembers: '1',
    memberNames: [''],
    email: '',
    password: '',
    confirmPassword: '',
  });

  const householdMembersCount = useMemo(() => {
    const parsed = parseStrictIntegerInput(form.householdMembers);
    if (parsed === null || parsed < 1) return 1;
    return Math.min(parsed, 50);
  }, [form.householdMembers]);

  const buildMemberNames = (count: number, name: string, current: string[]) => {
    const next = Array.from({ length: count }, (_, index) => current[index] ?? '');
    next[0] = name;
    return next;
  };

  const goToStepTwo = () => {
    if (!form.name.trim() || !form.fatherName.trim()) {
      toast.error('Name and father name are required');
      return;
    }

    if (householdMembersCount < 1) {
      toast.error('Household members must be at least 1');
      return;
    }

    setForm((prev) => ({
      ...prev,
      householdMembers: String(householdMembersCount),
      memberNames: buildMemberNames(householdMembersCount, prev.name.trim(), prev.memberNames),
    }));
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const whatsappNumber = form.whatsappNumber.trim();

    if (!token || !form.name.trim() || !form.fatherName.trim() || !whatsappNumber || !form.email || !form.password || !form.confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    const memberNames = buildMemberNames(
      householdMembersCount,
      form.name.trim(),
      form.memberNames.map((name) => name.trim()),
    );

    if (memberNames.length !== householdMembersCount) {
      toast.error('Member count mismatch');
      return;
    }

    if (memberNames.some((name) => !name)) {
      toast.error('All member names are required');
      return;
    }

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const result = await muqtadisService.register({
        token,
        name: form.name.trim(),
        fatherName: form.fatherName.trim(),
        phone: whatsappNumber,
        whatsappNumber,
        email: form.email,
        password: form.password,
        householdMembers: householdMembersCount,
        memberNames,
      });
      setAuth(result.user, result.mosque, result.accessToken);
      toast.success('Welcome to your household portal');
      router.push('/app/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to complete registration'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">MasjidFlow</span>
          </Link>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Join as Household</CardTitle>
            <CardDescription>Complete your invite-based registration.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {step === 1 ? (
                <>
                  <Input
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => {
                        const name = e.target.value;
                        return {
                          ...prev,
                          name,
                          memberNames: buildMemberNames(householdMembersCount, name.trim(), prev.memberNames),
                        };
                      })
                    }
                  />
                  <Input
                    placeholder="Father Name"
                    value={form.fatherName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fatherName: e.target.value }))}
                  />
                  <Input
                    placeholder="WhatsApp Number"
                    value={form.whatsappNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                  />
                  <Input
                    type="text"
                    min={1}
                    max={50}
                    placeholder="Household Members"
                    value={form.householdMembers}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const parsed = parseStrictIntegerInput(rawValue);
                      const count = parsed !== null && parsed > 0 ? Math.min(parsed, 50) : 1;
                      setForm((prev) => ({
                        ...prev,
                        householdMembers: rawValue,
                        memberNames: buildMemberNames(count, prev.name.trim(), prev.memberNames),
                      }));
                    }}
                  />
                  <Button type="button" className="w-full" onClick={goToStepTwo}>
                    Continue
                  </Button>
                </>
              ) : (
                <>
                  {Array.from({ length: householdMembersCount }).map((_, index) => {
                    const isFirst = index === 0;
                    const placeholder = isFirst ? 'Member 1 (auto-filled)' : `Dependent ${index}`;
                    return (
                      <Input
                        key={`member-${index + 1}`}
                        placeholder={placeholder}
                        value={isFirst ? form.name : (form.memberNames[index] ?? '')}
                        disabled={isFirst}
                        required={!isFirst}
                        onChange={(e) => {
                          if (isFirst) return;
                          const value = e.target.value;
                          setForm((prev) => {
                            const memberNames = buildMemberNames(householdMembersCount, prev.name.trim(), prev.memberNames);
                            memberNames[index] = value;
                            return { ...prev, memberNames };
                          });
                        }}
                      />
                    );
                  })}

                  <Input
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  />

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => setStep(1)} disabled={isLoading}>
                      Back
                    </Button>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Register
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

