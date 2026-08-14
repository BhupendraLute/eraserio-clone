'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentTableSkeletonProps {
  rows?: number;
}

export function DocumentTableSkeleton({ rows = 5 }: DocumentTableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-[#161618]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800/80 bg-[#121214] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            <th className="py-3 px-4 w-10 text-center">
              <Skeleton className="h-4 w-4 rounded mx-auto bg-zinc-800" />
            </th>
            <th className="py-3 px-4 font-bold">Name</th>
            <th className="py-3 px-4 font-bold">Location</th>
            <th className="py-3 px-4 font-bold">Created</th>
            <th className="py-3 px-4 font-bold">Edited</th>
            <th className="py-3 px-4 font-bold text-center">Author</th>
            <th className="py-3 px-4 font-bold text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/40 text-xs">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="h-12 bg-[#161618]">
              {/* Checkbox */}
              <td className="py-3 px-4 text-center">
                <Skeleton className="h-4 w-4 rounded mx-auto bg-zinc-800/80" />
              </td>

              {/* Title / Name */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded flex-shrink-0 bg-blue-500/20" />
                  <Skeleton className="h-3.5 w-48 rounded bg-zinc-800" />
                </div>
              </td>

              {/* Location */}
              <td className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-3 w-3 rounded bg-zinc-800/80" />
                  <Skeleton className="h-3 w-20 rounded bg-zinc-800/80" />
                </div>
              </td>

              {/* Created */}
              <td className="py-3 px-4">
                <Skeleton className="h-3 w-16 rounded bg-zinc-800/60" />
              </td>

              {/* Edited */}
              <td className="py-3 px-4">
                <Skeleton className="h-3 w-20 rounded bg-zinc-800/80" />
              </td>

              {/* Author */}
              <td className="py-3 px-4 text-center">
                <Skeleton className="h-5 w-5 rounded-full mx-auto bg-zinc-800" />
              </td>

              {/* Action Button */}
              <td className="py-3 px-4 text-right">
                <Skeleton className="h-4 w-4 rounded ml-auto bg-zinc-800/60" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
