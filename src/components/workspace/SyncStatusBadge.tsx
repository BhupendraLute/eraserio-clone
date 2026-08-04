'use client';

import { CheckCircle2, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SyncStatus } from '@/lib/store/document-store';

interface SyncStatusBadgeProps {
  /** Document persistence mode from the store: 'cloud' (signed in) or 'offline' (guest/local). */
  mode: 'cloud' | 'offline';
  /** Current sync state from the store. */
  syncStatus: SyncStatus;
  /** Extra classes — e.g. `text-xs` to match a dropdown's font size. */
  className?: string;
}

/**
 * Unified document sync status indicator used by the header DocumentSwitcher
 * badge and the UserNav avatar dropdown, so both always show the same wording
 * and the same emerald/amber/red color coding.
 */
export function SyncStatusBadge({ mode, syncStatus, className }: SyncStatusBadgeProps) {
  const base = cn('flex items-center gap-1 text-[11px] font-medium', className);
  const icon = 'h-3 w-3 shrink-0';

  if (syncStatus === 'saving') {
    return (
      <span className={cn(base, 'text-amber-500 dark:text-amber-400')}>
        <Loader2 className={cn(icon, 'animate-spin')} />
        <span>Saving...</span>
      </span>
    );
  }

  if (syncStatus === 'error') {
    return (
      <span className={cn(base, 'text-red-500 dark:text-red-400')}>
        <CloudOff className={icon} />
        <span>Sync failed</span>
      </span>
    );
  }

  if (mode === 'offline') {
    return (
      <span className={cn(base, 'text-amber-600 dark:text-amber-400')}>
        <CloudOff className={icon} />
        <span>Local only</span>
      </span>
    );
  }

  if (syncStatus === 'offline') {
    return (
      <span className={cn(base, 'text-muted-foreground')}>
        <CloudOff className={icon} />
        <span>Offline</span>
      </span>
    );
  }

  return (
    <span className={cn(base, 'text-emerald-600 dark:text-emerald-400')}>
      <CheckCircle2 className={icon} />
      <span>Cloud sync</span>
    </span>
  );
}
