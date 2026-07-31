'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  hasDropdownChevron?: boolean;
  icon?: React.ReactNode;
  label?: React.ReactNode;
}

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ className, active, hasDropdownChevron, icon, label, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-lg px-2 text-foreground transition-colors hover:bg-accent text-xs font-medium select-none',
          active && 'bg-accent text-foreground font-semibold',
          className
        )}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {label && <span>{label}</span>}
        {children}
        {hasDropdownChevron && (
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" className="shrink-0 opacity-70">
            <path d="M2 3.5L5 7L8 3.5" />
          </svg>
        )}
      </button>
    );
  }
);

ToolbarButton.displayName = 'ToolbarButton';
