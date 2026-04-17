'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

export function NotificationsSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const [notifications, setNotifications] = useState({
    emailDonations: true,
    emailExpenses: true,
    emailReports: false,
    emailMembers: true,
  });
  const [snapshotNotifications, setSnapshotNotifications] = useState(notifications);

  const handleSave = () => {
    setSnapshotNotifications(notifications);
    setIsEditing(false);
    toast.success('Notification preferences updated');
  };

  const handleCancel = () => {
    setNotifications(snapshotNotifications);
    setIsEditing(false);
  };

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Bell className="h-5 w-5" />
              Notifications Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground">Choose what notifications you want to receive</CardDescription>
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
          <p><span className="text-muted-foreground">Donations:</span> {notifications.emailDonations ? 'Enabled' : 'Disabled'}</p>
          <p><span className="text-muted-foreground">Expenses:</span> {notifications.emailExpenses ? 'Enabled' : 'Disabled'}</p>
          <p><span className="text-muted-foreground">Weekly reports:</span> {notifications.emailReports ? 'Enabled' : 'Disabled'}</p>
          <p><span className="text-muted-foreground">Member activity:</span> {notifications.emailMembers ? 'Enabled' : 'Disabled'}</p>
        </section>

        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-foreground">New Donations</Label>
            <p className="text-sm text-muted-foreground">Get notified when a new donation is recorded</p>
          </div>
          <Switch
            checked={notifications.emailDonations}
            disabled={!isEditing}
            onCheckedChange={(checked) => setNotifications({ ...notifications, emailDonations: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-foreground">New Expenses</Label>
            <p className="text-sm text-muted-foreground">Get notified when a new expense is added</p>
          </div>
          <Switch
            checked={notifications.emailExpenses}
            disabled={!isEditing}
            onCheckedChange={(checked) => setNotifications({ ...notifications, emailExpenses: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-foreground">Weekly Reports</Label>
            <p className="text-sm text-muted-foreground">Receive a weekly summary of financial activity</p>
          </div>
          <Switch
            checked={notifications.emailReports}
            disabled={!isEditing}
            onCheckedChange={(checked) => setNotifications({ ...notifications, emailReports: checked })}
          />
        </div>
        <Separator />
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="text-foreground">Member Activity</Label>
            <p className="text-sm text-muted-foreground">Get notified about new members and invitations</p>
          </div>
          <Switch
            checked={notifications.emailMembers}
            disabled={!isEditing}
            onCheckedChange={(checked) => setNotifications({ ...notifications, emailMembers: checked })}
          />
        </div>

        {isEditing ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
