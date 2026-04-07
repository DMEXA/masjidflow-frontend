import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReactNode } from 'react';

interface TrashMobileCardProps {
  title: string;
  subtitle?: string;
  deletedAt: string;
  actions: ReactNode;
}

export function TrashMobileCard({ title, subtitle, deletedAt, actions }: TrashMobileCardProps) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div>
          <p className="font-medium text-foreground">{title}</p>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Deleted</Badge>
          <span className="text-xs text-muted-foreground">{deletedAt}</span>
        </div>
        <div>{actions}</div>
      </CardContent>
    </Card>
  );
}
