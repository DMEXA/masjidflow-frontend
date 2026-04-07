'use client';

import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ActionOverflowItem = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

type ActionOverflowMenuProps = {
  items: ActionOverflowItem[];
  align?: 'start' | 'center' | 'end';
};

export function ActionOverflowMenu({ items, align = 'end' }: ActionOverflowMenuProps) {
  const visibleItems = items.filter((item) => !item.disabled);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" aria-label="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {visibleItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            variant={item.destructive ? 'destructive' : 'default'}
            onSelect={(event) => {
              event.preventDefault();
              item.onSelect();
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
