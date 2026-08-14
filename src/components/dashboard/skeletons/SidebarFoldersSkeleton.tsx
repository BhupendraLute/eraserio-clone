'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function SidebarFoldersSkeleton() {
  return (
    <div className="space-y-1.5 px-1 py-1">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between px-2.5 h-8 rounded-lg bg-zinc-900/40"
        >
          <div className="flex items-center gap-2.5 flex-1">
            <Skeleton className="h-3.5 w-3.5 rounded-md bg-zinc-800" />
            <Skeleton className="h-3 w-28 rounded bg-zinc-800" />
          </div>
          <Skeleton className="h-3 w-4 rounded bg-zinc-800/80" />
        </div>
      ))}
    </div>
  );
}
