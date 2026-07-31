'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import { WHITEBOARD_COLORS, WHITEBOARD_COLOR_KEYS } from '@/lib/whiteboard/whiteboard-types';
import { Pencil, Eraser, MoreHorizontal, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LineWidthSize } from '@/lib/store/whiteboard-store';

const PENCIL_SIZE_OPTIONS: { size: LineWidthSize; width: number; dotSizePx: number; label: string }[] = [
  { size: 'S', width: 1.5, dotSizePx: 4, label: 'Thin (S)' },
  { size: 'M', width: 3, dotSizePx: 7, label: 'Medium (M)' },
  { size: 'L', width: 6, dotSizePx: 10, label: 'Thick (L)' },
  { size: 'XL', width: 10, dotSizePx: 14, label: 'Extra Thick (XL)' },
];

export function PencilToolbar() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);

  const activeStrokeWidth = useWhiteboardStore((s) => s.activeStrokeWidth);
  const setActiveStrokeWidth = useWhiteboardStore((s) => s.setActiveStrokeWidth);
  const activeLineWidthSize = useWhiteboardStore((s) => s.activeLineWidthSize);
  const setActiveLineWidthSize = useWhiteboardStore((s) => s.setActiveLineWidthSize);

  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);
  const setActiveStrokeHex = useWhiteboardStore((s) => s.setActiveStrokeHex);
  const setActiveColor = useWhiteboardStore((s) => s.setActiveColor);

  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine if single pencil stroke is selected
  const selectedPencilElement =
    selectedIds.length === 1
      ? elements.find((el) => el.id === selectedIds[0] && el.type === 'pencil')
      : null;

  const isVisible = activeTool === 'pencil' || activeTool === 'eraser' || !!selectedPencilElement;

  // Close dropdown on outside click via reusable hook
  useOnClickOutside(
    menuRef,
    useCallback(() => setShowMoreMenu(false), []),
    showMoreMenu
  );

  if (!isVisible) return null;

  const handleSelectSize = (size: LineWidthSize, width: number) => {
    setActiveLineWidthSize(size);
    setActiveStrokeWidth(width);
    if (selectedPencilElement) {
      updateElement(selectedPencilElement.id, { strokeWidth: width });
    }
  };

  const handleSelectColor = (colorKey: (typeof WHITEBOARD_COLOR_KEYS)[number]) => {
    setActiveColor(colorKey);
    const hex = WHITEBOARD_COLORS[colorKey].border;
    if (selectedPencilElement) {
      updateElement(selectedPencilElement.id, { strokeColor: hex });
    }
  };

  const handleCustomHexChange = (hex: string) => {
    setActiveStrokeHex(hex);
    if (selectedPencilElement) {
      updateElement(selectedPencilElement.id, { strokeColor: hex });
    }
  };

  const strokeColorDisplay = selectedPencilElement?.strokeColor || activeStrokeHex;

  return (
    <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border bg-muted/95 p-1.5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95 select-none">
      {/* 1. Pencil Tool Button */}
      <button
        onClick={() => setActiveTool('pencil')}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
          activeTool === 'pencil'
            ? 'bg-primary/20 text-primary font-semibold shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        title="Pencil / Draw (P)"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {/* 2. Eraser Tool Button */}
      <button
        onClick={() => setActiveTool('eraser')}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
          activeTool === 'eraser'
            ? 'bg-primary/20 text-primary font-semibold shadow-sm'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        title="Eraser (E)"
      >
        <Eraser className="h-4 w-4" />
      </button>

      {/* Divider */}
      <div className="h-4 w-px bg-border/80 my-auto" />

      {/* 3. 4 Preset Stroke Weight / Size Dots */}
      <div className="flex items-center gap-1 px-1">
        {PENCIL_SIZE_OPTIONS.map((opt) => {
          const isSelected = selectedPencilElement
            ? selectedPencilElement.strokeWidth === opt.width
            : activeLineWidthSize === opt.size || activeStrokeWidth === opt.width;

          return (
            <button
              key={opt.size}
              onClick={() => handleSelectSize(opt.size, opt.width)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-all hover:bg-accent',
                isSelected && 'bg-accent/80 text-foreground ring-1 ring-border'
              )}
              title={opt.label}
            >
              <span
                className={cn(
                  'rounded-full transition-transform',
                  isSelected ? 'bg-primary scale-110' : 'bg-muted-foreground/60'
                )}
                style={{
                  width: `${opt.dotSizePx}px`,
                  height: `${opt.dotSizePx}px`,
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-border/80 my-auto" />

      {/* 4. More Options Button (...) */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
            showMoreMenu
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
          title="More options & stroke color"
        >
          <div className="relative flex items-center justify-center">
            <MoreHorizontal className="h-4 w-4" />
            <span
              className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-background shadow-xs"
              style={{ backgroundColor: strokeColorDisplay === 'currentColor' ? 'var(--foreground)' : strokeColorDisplay }}
            />
          </div>
        </button>

        {/* More Options Popover Dropdown */}
        {showMoreMenu && (
          <div className="absolute bottom-full left-1/2 mb-2.5 w-56 -translate-x-1/2 rounded-xl border bg-muted/95 p-3 shadow-2xl backdrop-blur z-50 flex flex-col gap-2.5 text-xs animate-in fade-in zoom-in-95">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Stroke Color
            </div>

            {/* Color swatches */}
            <div className="grid grid-cols-6 gap-1.5">
              {WHITEBOARD_COLOR_KEYS.map((colorKey) => {
                const c = WHITEBOARD_COLORS[colorKey];
                const isCurrent = strokeColorDisplay === c.border;
                return (
                  <button
                    key={colorKey}
                    onClick={() => handleSelectColor(colorKey)}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border transition-transform hover:scale-110',
                      isCurrent && 'ring-2 ring-primary ring-offset-1 ring-offset-muted'
                    )}
                    style={{ backgroundColor: c.border }}
                    title={colorKey}
                  >
                    {isCurrent && <Check className="h-3 w-3 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>

            <div className="h-px w-full bg-border" />

            {/* Custom hex color picker */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Custom Color</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {strokeColorDisplay}
                </span>
                <input
                  type="color"
                  value={strokeColorDisplay === 'currentColor' ? '#ffffff' : strokeColorDisplay}
                  onChange={(e) => handleCustomHexChange(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  title="Custom hex color"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete button when a pencil stroke is selected */}
      {selectedPencilElement && (
        <>
          <div className="h-4 w-px bg-border/80 my-auto" />
          <button
            onClick={() => deleteElements([selectedPencilElement.id])}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-destructive hover:bg-destructive/15 transition-all"
            title="Delete pencil stroke"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
