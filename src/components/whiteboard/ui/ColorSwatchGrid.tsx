'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ColorSwatchGridProps {
  palette: readonly string[];
  currentColor: string;
  onSelectColor: (hex: string) => void;
  showTransparentOption?: boolean;
  showCustomPicker?: boolean;
  className?: string;
}

export function ColorSwatchGrid({
  palette,
  currentColor,
  onSelectColor,
  showTransparentOption = true,
  showCustomPicker = true,
  className,
}: ColorSwatchGridProps) {
  const isTransparent = currentColor === 'transparent';

  return (
    <div className={cn('grid grid-cols-4 gap-1.5', className)}>
      {palette.map((hex) => {
        const isSelected = currentColor === hex;
        return (
          <button
            key={hex}
            type="button"
            onClick={() => onSelectColor(hex)}
            className={cn(
              'h-6 w-6 rounded-md border transition-transform hover:scale-110 focus:outline-none',
              isSelected && 'ring-2 ring-primary ring-offset-1'
            )}
            style={{ backgroundColor: hex }}
          />
        );
      })}

      {showCustomPicker && (
        <div className="relative flex h-6 w-6 items-center justify-center rounded-md border bg-gradient-to-br from-red-500 via-green-500 to-blue-500 overflow-hidden cursor-pointer">
          <input
            type="color"
            value={isTransparent ? '#ffffff' : currentColor}
            onChange={(e) => onSelectColor(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            title="Custom color"
          />
        </div>
      )}

      {showTransparentOption && (
        <button
          type="button"
          onClick={() => onSelectColor('transparent')}
          className={cn(
            'relative h-6 w-6 rounded-md border bg-background overflow-hidden flex items-center justify-center transition-transform hover:scale-110 focus:outline-none',
            isTransparent && 'ring-2 ring-primary ring-offset-1'
          )}
          title="Transparent (None)"
        >
          <div className="absolute h-[1.5px] w-full bg-red-500 rotate-45" />
        </button>
      )}
    </div>
  );
}
