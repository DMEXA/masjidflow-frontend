'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageBackButtonProps {
  fallbackHref?: string;
  label?: string;
}

export function PageBackButton({ fallbackHref = '/dashboard', label = 'Back' }: PageBackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      className="-ml-2 h-8 px-2 text-muted-foreground"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      {label}
    </Button>
  );
}
