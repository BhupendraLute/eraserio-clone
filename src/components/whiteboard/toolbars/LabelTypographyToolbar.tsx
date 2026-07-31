'use client';

import React from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';
import { cn } from '@/lib/utils';
import { AlignLeft, AlignCenter, AlignRight, Plus, Minus } from 'lucide-react';

export const ERASER_FONTS = [
  { name: 'Rough', val: "'Caveat', cursive, sans-serif" },
  { name: 'Clean', val: 'Inter, sans-serif' },
  { name: 'Mono', val: "'Courier New', monospace" },
] as const;

export const FONT_SIZE_PRESETS = [
  { label: 'Small', sz: 12 },
  { label: 'Medium', sz: 16 },
  { label: 'Large', sz: 24 },
  { label: 'X-Large', sz: 34 },
] as const;

interface LabelTypographyToolbarProps {
  selectedElements: WhiteboardElement[];
  openPopup: string | null;
  togglePopup: (popupName: 'fontSize' | 'typography') => void;
  setOpenPopup: (popupName: 'fontSize' | 'typography' | null) => void;
}

export function LabelTypographyToolbar({
  selectedElements,
  openPopup,
  togglePopup,
  setOpenPopup,
}: LabelTypographyToolbarProps) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);

  const firstEl = selectedElements[0];
  if (!firstEl) return null;

  const currentFontFamily = firstEl?.labelFontFamily ?? firstEl?.fontFamily ?? "'Caveat', cursive, sans-serif";
  const currentFontSize = firstEl?.labelFontSize ?? firstEl?.fontSize ?? 14;
  const currentTextAlign = firstEl?.textAlign ?? 'center';
  const currentLabelColor = firstEl?.labelColor ?? firstEl?.textColor ?? 'currentColor';

  const handleSelectFontFamily = (val: string) => {
    selectedElements.forEach((el) => {
      updateElement(el.id, { labelFontFamily: val, fontFamily: val });
    });
    setOpenPopup(null);
  };

  const handleSelectFontSize = (sz: number) => {
    const validSize = Math.max(8, Math.min(72, sz));
    selectedElements.forEach((el) => {
      updateElement(el.id, { labelFontSize: validSize, fontSize: validSize });
    });
  };

  const handleSelectTextAlign = (align: 'left' | 'center' | 'right') => {
    selectedElements.forEach((el) => {
      updateElement(el.id, { textAlign: align });
    });
  };

  const handleSelectLabelColor = (colorHex: string) => {
    selectedElements.forEach((el) => {
      updateElement(el.id, { labelColor: colorHex, textColor: colorHex });
    });
  };

  return (
    <>
      <div className="h-5 w-px bg-border" />

      {/* 1. Font Size Dropdown Button: e.g. "34px ▼" (Matching Screenshot 1) */}
      <div className="relative">
        <button
          onClick={() => togglePopup('fontSize')}
          className={cn(
            'flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-accent',
            openPopup === 'fontSize' && 'bg-accent'
          )}
          title="Font Size"
        >
          <span>{currentFontSize}px</span>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 3.5L5 7L8 3.5" />
          </svg>
        </button>

        {openPopup === 'fontSize' && (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl border bg-muted/95 p-2 shadow-2xl backdrop-blur z-50 min-w-[130px] flex flex-col gap-1.5 animate-in fade-in zoom-in-95">
            {/* Top Stepper Row: -  34px  + */}
            <div className="flex items-center justify-between border-b pb-1.5 px-1">
              <button
                onClick={() => handleSelectFontSize(currentFontSize - 2)}
                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Decrease font size"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-xs font-semibold">{currentFontSize}px</span>
              <button
                onClick={() => handleSelectFontSize(currentFontSize + 2)}
                className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Increase font size"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Presets List: Small, Medium, Large, X-Large */}
            <div className="flex flex-col gap-0.5">
              {FONT_SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    handleSelectFontSize(preset.sz);
                    setOpenPopup(null);
                  }}
                  className={cn(
                    'flex h-7 items-center rounded-md px-2 text-xs font-medium transition-colors text-left',
                    currentFontSize === preset.sz
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Typography & Formatting Dropdown Button: "T ▼" (Matching Screenshot 2) */}
      <div className="relative">
        <button
          onClick={() => togglePopup('typography')}
          className={cn(
            'flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors hover:bg-accent',
            openPopup === 'typography' && 'bg-accent'
          )}
          title="Text Typography & Formatting"
        >
          <span>T</span>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 3.5L5 7L8 3.5" />
          </svg>
        </button>

        {openPopup === 'typography' && (
          <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl border bg-muted/95 p-2 shadow-2xl backdrop-blur z-50 min-w-[140px] flex flex-col gap-2 animate-in fade-in zoom-in-95">
            {/* Font Family Options: Rough, Clean, Mono */}
            <div className="flex flex-col gap-0.5">
              {ERASER_FONTS.map((f) => {
                const isActive =
                  currentFontFamily.includes(f.val) ||
                  (f.name === 'Rough' && currentFontFamily.includes('Caveat')) ||
                  (f.name === 'Clean' && currentFontFamily.includes('Inter')) ||
                  (f.name === 'Mono' && currentFontFamily.includes('Courier'));
                return (
                  <button
                    key={f.name}
                    onClick={() => handleSelectFontFamily(f.val)}
                    className={cn(
                      'flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors text-left',
                      isActive
                        ? 'bg-primary/15 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                    style={{ fontFamily: f.val }}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>

            <div className="h-px w-full bg-border" />

            {/* Bottom Row: Text Color Swatch + Alignment Buttons */}
            <div className="flex items-center justify-between px-1 gap-1">
              {/* Color Swatch Picker */}
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={currentLabelColor === 'currentColor' ? '#ffffff' : currentLabelColor}
                  onChange={(e) => handleSelectLabelColor(e.target.value)}
                  className="h-6 w-6 cursor-pointer rounded-full border border-border p-0 bg-transparent overflow-hidden"
                  title="Text Color"
                />
              </div>

              {/* Text Alignment Button Group */}
              <div className="flex items-center gap-0.5 rounded-lg border bg-background/50 p-0.5">
                <button
                  onClick={() => handleSelectTextAlign('left')}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded transition-colors',
                    currentTextAlign === 'left' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Align Left"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleSelectTextAlign('center')}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded transition-colors',
                    currentTextAlign === 'center' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Align Center"
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleSelectTextAlign('right')}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded transition-colors',
                    currentTextAlign === 'right' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Align Right"
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
