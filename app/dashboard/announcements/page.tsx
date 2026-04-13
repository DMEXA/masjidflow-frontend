'use client';

import { useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageBackButton } from '@/components/common/page-back-button';
import { announcementsService, type AnnouncementItem } from '@/services/announcements.service';
import { getErrorMessage } from '@/src/utils/error';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { ListEmptyState } from '@/components/common/list-empty-state';
import { useAuthStore } from '@/src/store/auth.store';
import { usePermission } from '@/hooks/usePermission';

export default function AdminAnnouncementsPage() {
  const queryClient = useQueryClient();
  const { user, mosque } = useAuthStore();
  const { canCreate, canEdit, canDelete } = usePermission(user?.role);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const announcementsQuery = useQuery<AnnouncementItem[]>({
    queryKey: queryKeys.announcementsByMosque(mosque?.id),
    queryFn: () => announcementsService.getAll(mosque?.id),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; message: string }) => announcementsService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcementsByMosque(mosque?.id) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; title: string; message: string }) =>
      announcementsService.update(payload.id, { title: payload.title, message: payload.message }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcementsByMosque(mosque?.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcementsByMosque(mosque?.id) });
    },
  });

  const submitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const announcements = announcementsQuery.data ?? [];

  const createAnnouncement = async () => {
    if (editingId) {
      if (!canEdit) return;
    } else if (!canCreate) {
      return;
    }

    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, title: title.trim(), message: message.trim() });
        toast.success('Announcement updated');
      } else {
        await createMutation.mutateAsync({ title: title.trim(), message: message.trim() });
        toast.success('Announcement created');
      }
      setTitle('');
      setMessage('');
      setEditingId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create announcement'));
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!canDelete) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Announcement deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete announcement'));
    }
  };

  const editAnnouncement = (item: AnnouncementItem) => {
    if (!canEdit) return;

    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-background p-2">
        <PageBackButton fallbackHref="/dashboard" />
      </div>

      <PageHeader title="Announcements" description="Create and manage muqtadi announcements" />

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Announcement' : 'Create Announcement'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={createAnnouncement} disabled={submitting || (editingId ? !canEdit : !canCreate)}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Update' : 'Publish'}
            </Button>
            {editingId ? (
              <Button variant="outline" onClick={cancelEdit} disabled={submitting}>Cancel</Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Announcements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcementsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : announcements.length === 0 ? (
            <ListEmptyState
              title="No announcements yet"
              description="Publish your first update to inform your members."
              actionLabel={canCreate ? 'Create Announcement' : undefined}
              onAction={canCreate ? () => window.scrollTo({ top: 0, behavior: 'smooth' }) : undefined}
              className="min-h-40"
            />
          ) : (
            announcements.map((item) => (
              <div key={item.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      }).format(new Date(item.createdAt))}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled={submitting || !canDelete} onClick={() => deleteAnnouncement(item.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button variant="outline" size="sm" disabled={submitting || !canEdit} onClick={() => editAnnouncement(item)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


