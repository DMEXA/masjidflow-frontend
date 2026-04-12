'use client';

import { Loader2 } from 'lucide-react';

interface AuthLoadingScreenProps {
  message?: string;
}

export function AuthLoadingScreen({ message = 'Checking your session...' }: AuthLoadingScreenProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-12 bottom-6 h-52 w-52 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur">
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-primary/70" />
        </div>
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
