'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, Globe, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/src/store/auth.store';
import { mosqueService, updateMosqueProfile, type UpdateMosqueData } from '@/services/mosque.service';

export function GeneralSettings() {
  const fieldClass = 'w-full rounded-xl px-4 py-3';
  const { mosque: currentMosque } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    village: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    website: '',
    description: '',
  });
  const [initialFormData, setInitialFormData] = useState(formData);

  const mosqueQuery = useQuery({
    queryKey: ['mosque'],
    queryFn: () => {
      if (!currentMosque?.id) {
        throw new Error('Mosque not found');
      }
      return mosqueService.getById(currentMosque.id);
    },
    enabled: Boolean(currentMosque?.id),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(() => {
    const mosque = mosqueQuery.data;
    if (!mosque) {
      return;
    }

    const nextFormData = {
      name: mosque.name || '',
      state: mosque.state || '',
      city: mosque.city || '',
      village: (mosque as { village?: string }).village || '',
      phone: mosque.phone || '',
      website: mosque.website || '',
      description: mosque.description || '',
      address: mosque.address || '',
      email: mosque.email || '',
    };
    setFormData(nextFormData);
    setInitialFormData(nextFormData);
  }, [mosqueQuery.data]);

  const mosqueProfileMutation = useMutation({
    mutationFn: (data: UpdateMosqueData) => {
      if (!currentMosque?.id) {
        throw new Error('Mosque not found');
      }
      return updateMosqueProfile(currentMosque.id, data);
    },
    onSuccess: (updatedMosque) => {
      toast.success('Settings updated');
      useAuthStore.setState((state) => ({
        ...state,
        mosque: state.mosque ? { ...state.mosque, ...updatedMosque } : updatedMosque,
      }));
      setFormData((prev) => ({
        ...prev,
        name: updatedMosque.name ?? prev.name,
        address: updatedMosque.address ?? prev.address,
        phone: updatedMosque.phone ?? prev.phone,
        email: updatedMosque.email ?? prev.email,
      }));
      setInitialFormData((prev) => ({
        ...prev,
        name: updatedMosque.name ?? prev.name,
        address: updatedMosque.address ?? prev.address,
        phone: updatedMosque.phone ?? prev.phone,
        email: updatedMosque.email ?? prev.email,
      }));
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to update');
    },
  });

  const publicUrl = useMemo(() => {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/mosque/${currentMosque?.slug || 'your-mosque'}`;
  }, [currentMosque?.slug]);

  const handleSubmitGeneralSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: UpdateMosqueData = {
      name: formData.name,
      address: formData.address,
      state: formData.state,
      city: formData.city,
      village: formData.village,
      phone: formData.phone,
      email: formData.email || undefined,
      website: formData.website || undefined,
      description: formData.description || undefined,
    };

    mosqueProfileMutation.mutate(payload);
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setIsEditing(false);
  };

  return (
    <section className="rounded-xl border p-4 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">General Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your mosque profile and public information.</p>
          </div>
        </div>

        {!isEditing ? (
          <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>

      <section className="rounded-xl border bg-muted/30 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Read-only summary</p>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <p><span className="text-muted-foreground">Name:</span> {formData.name || 'Not set'}</p>
          <p><span className="text-muted-foreground">Phone:</span> {formData.phone || 'Not set'}</p>
          <p><span className="text-muted-foreground">City:</span> {formData.city || 'Not set'}</p>
          <p><span className="text-muted-foreground">State:</span> {formData.state || 'Not set'}</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {formData.address || 'Not set'}</p>
        </div>
      </section>

      <form className="space-y-4" onSubmit={handleSubmitGeneralSettings}>
        <div className="space-y-2">
          <Label htmlFor="mosque-name">Mosque Name</Label>
          <Input
            id="mosque-name"
            className={fieldClass}
            value={formData.name}
            disabled={!isEditing}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="mosque-state">State</Label>
            <Input
              id="mosque-state"
              className={fieldClass}
              value={formData.state}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mosque-city">City</Label>
            <Input
              id="mosque-city"
              className={fieldClass}
              value={formData.city}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mosque-village">Village / Area</Label>
            <Input
              id="mosque-village"
              className={fieldClass}
              value={formData.village}
              disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mosque-address">Address (Optional)</Label>
          <Textarea
            id="mosque-address"
            className={fieldClass}
            value={formData.address}
            disabled={!isEditing}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            className={fieldClass}
            placeholder="+91 98765 43210"
            value={formData.phone}
            disabled={!isEditing}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email (Secondary)</Label>
          <Input
            id="email"
            type="email"
            className={fieldClass}
            placeholder="admin@mosque.com"
            value={formData.email}
            disabled={!isEditing}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            className={fieldClass}
            placeholder="https://"
            value={formData.website}
            disabled={!isEditing}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            className={fieldClass}
            placeholder="Tell people about your mosque..."
            value={formData.description}
            disabled={!isEditing}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        {isEditing ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={mosqueProfileMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mosqueProfileMutation.isPending}>
              {mosqueProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        ) : null}
      </form>

      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          <h2 className="text-lg font-semibold text-foreground">Public Page</h2>
        </div>
        <p className="text-sm text-muted-foreground">Your mosque has a public page at:</p>
        <div className="bg-gray-100 rounded-xl px-3 py-2 text-sm break-all">{publicUrl}</div>
      </section>
    </section>
  );
}
