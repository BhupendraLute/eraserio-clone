'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { LineWidthSize } from '@/lib/store/whiteboard-store';

export interface LineWidthOption {
  size: LineWidthSize;
  label: string;
  width: number;
}

export const DEFAULT_LINE_WIDTH_OPTIONS: LineWidthOption[] = [
  { size: 'S', label: 'S', width: 1 },
  { size: 'M', label: 'M', width: 2 },
  { size: 'L', label: 'L', width: 4 },
  { size: 'XL', label: 'XL', width: 8 },
];

export interface LineWidthSelectorProps {
  currentSize: LineWidthSize;
  onSelect: (opt: LineWidthOption) => void;
  options?: LineWidthOption[];
  className?: string;
}

export function LineWidthSelector({
  currentSize,
  onSelect,
  options = DEFAULT_LINE_WIDTH_OPTIONS,
  className,
}: LineWidthSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1 bg-background/50 p-1 rounded-lg border border-border/40', className)}>
      {options.map((opt) => {
        const isSelected = currentSize === opt.size;
        return (
          <button
            key={opt.size}
            type="button"
            onClick={() => onSelect(opt)}
            className={cn(
              'flex h-7 w-8 items-center justify-center rounded-md text-xs font-semibold transition-all',
              isSelected
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            title={`Stroke ${opt.label} (${opt.width}px)`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
