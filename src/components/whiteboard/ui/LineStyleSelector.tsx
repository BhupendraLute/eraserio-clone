'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { LineStyle } from '@/lib/whiteboard/whiteboard-types';

export interface LineStyleOption {
  style: LineStyle;
  label: string;
  dashArray: string;
}

export const DEFAULT_LINE_STYLE_OPTIONS: LineStyleOption[] = [
  { style: 'solid', label: 'Solid', dashArray: '' },
  { style: 'dashed', label: 'Dashed', dashArray: '4 4' },
  { style: 'dotted', label: 'Dotted', dashArray: '2 2' },
];

export interface LineStyleSelectorProps {
  currentStyle: LineStyle;
  onSelect: (style: LineStyle) => void;
  options?: LineStyleOption[];
  className?: string;
}

export function LineStyleSelector({
  currentStyle,
  onSelect,
  options = DEFAULT_LINE_STYLE_OPTIONS,
  className,
}: LineStyleSelectorProps) {
  return (
    <div className={cn('flex items-center gap-1.5 justify-between border-b pb-2.5', className)}>
      {options.map((opt) => {
        const isSelected = currentStyle === opt.style;
        return (
          <button
            key={opt.style}
            type="button"
            onClick={() => onSelect(opt.style)}
            className={cn(
              'flex h-7 w-12 items-center justify-center rounded-md border transition-all',
              isSelected
                ? 'bg-primary/20 text-primary border-primary/50 ring-1 ring-primary/40'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground border-border/50'
            )}
            title={opt.label}
          >
            <svg width="24" height="2" viewBox="0 0 24 2" className="overflow-visible">
              <line
                x1="0"
                y1="1"
                x2="24"
                y2="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={opt.dashArray}
                strokeLinecap="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
