'use client';

import { Building2, Loader2 } from 'lucide-react';

interface AppShellLoaderProps {
  title?: string;
  message?: string;
}

export function AppShellLoader({
  title = 'Preparing your workspace',
  message = 'Restoring your session, profile, and mosque context...',
}: AppShellLoaderProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-12 bottom-6 h-52 w-52 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card/85 p-6 shadow-sm backdrop-blur animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">MasjidFlow</p>
            <p className="text-xs text-muted-foreground">Muqtadi App</p>
          </div>
        </div>

        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>

        <div className="mt-5 overflow-hidden rounded-xl border border-border/80 bg-background/80 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing app shell
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-2/5 rounded-full bg-primary/70 app-shimmer-track" />
          </div>
        </div>
      </div>
    </div>
  );
}
