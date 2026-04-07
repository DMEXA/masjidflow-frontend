'use client';

import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';

interface TrashActionButtonsProps {
  restoring: boolean;
  deleting: boolean;
  onRestore: () => void;
  onPermanentDelete: () => void;
}

export function TrashActionButtons({
  restoring,
  deleting,
  onRestore,
  onPermanentDelete,
}: TrashActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-55">
      <Button className="h-8 rounded-md" size="sm" variant="outline" disabled={restoring || deleting} onClick={onRestore}>
        {restoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
        Restore
      </Button>
      <Button
        className="h-8 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        size="sm"
        variant="outline"
        disabled={restoring || deleting}
        onClick={onPermanentDelete}
      >
        {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
        Delete
      </Button>
    </div>
  );
}
