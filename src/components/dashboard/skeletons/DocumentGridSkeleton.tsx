'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentGridSkeletonProps {
  cards?: number;
}

export function DocumentGridSkeleton({ cards = 6 }: DocumentGridSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-zinc-800/80 bg-[#161618] p-4 flex flex-col justify-between h-44"
        >
          {/* Header with icon & actions */}
          <div className="flex items-start justify-between">
            <Skeleton className="h-4 w-4 rounded bg-zinc-800" />
            <Skeleton className="h-4 w-16 rounded-md bg-zinc-800/80" />
          </div>

          {/* Body with icon & title */}
          <div className="space-y-2 my-2">
            <Skeleton className="h-8 w-8 rounded-xl bg-blue-500/10" />
            <Skeleton className="h-4 w-36 rounded bg-zinc-800" />
          </div>

          {/* Footer with date & avatar */}
          <div className="flex items-center justify-between border-t border-zinc-800/60 pt-2">
            <Skeleton className="h-3 w-16 rounded bg-zinc-800/60" />
            <Skeleton className="h-4 w-4 rounded-full bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
