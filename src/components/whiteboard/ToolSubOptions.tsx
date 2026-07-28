'use client';

import React from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { WHITEBOARD_COLORS, isPolygonShapeType } from '@/lib/whiteboard/whiteboard-types';
import { cn } from '@/lib/utils';
import type { LineWidthSize } from '@/lib/store/whiteboard-store';

const LINE_WIDTH_OPTIONS: { size: LineWidthSize; label: string }[] = [
  { size: 'S', label: 'S' },
  { size: 'M', label: 'M' },
  { size: 'L', label: 'L' },
  { size: 'XL', label: 'XL' },
];

export function ToolSubOptions() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeCornerRadius = useWhiteboardStore((s) => s.activeCornerRadius);
  const setActiveCornerRadius = useWhiteboardStore((s) => s.setActiveCornerRadius);
  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);
  const setActiveStrokeHex = useWhiteboardStore((s) => s.setActiveStrokeHex);
  const activeFillHex = useWhiteboardStore((s) => s.activeFillHex);
  const setActiveFillHex = useWhiteboardStore((s) => s.setActiveFillHex);
  const activeLineWidthSize = useWhiteboardStore((s) => s.activeLineWidthSize);
  const setActiveLineWidthSize = useWhiteboardStore((s) => s.setActiveLineWidthSize);
  const setActiveColor = useWhiteboardStore((s) => s.setActiveColor);

  // Arrow, line, and shape tools use bottom toolbars (ArrowToolbar / ShapeToolbar) instead
  if (activeTool === 'select') return null;
  if (activeTool === 'arrow' || activeTool === 'line') return null;
  if (isPolygonShapeType(activeTool)) return null;

  return (
    <div className="absolute top-full left-0 mt-1 z-50 flex items-center gap-1.5 rounded-lg border bg-muted/90 p-1.5 shadow-lg backdrop-blur animate-in fade-in zoom-in-95">

      {/* Text sub-options: font size presets */}
      {activeTool === 'text' && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Size</span>
          {[12, 14, 16, 20, 24, 32].map((s) => (
            <button
              key={s}
              className={cn(
                'flex h-6 w-7 items-center justify-center rounded-md text-[10px] font-medium transition-colors',
                'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={`${s}px`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Pencil sub-options: S/M/L/XL stroke width */}
      {activeTool === 'pencil' && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Width</span>
          {LINE_WIDTH_OPTIONS.map((opt) => (
            <button
              key={opt.size}
              onClick={() => setActiveLineWidthSize(opt.size)}
              className={cn(
                'flex h-6 w-8 items-center justify-center gap-1 rounded-md text-[10px] font-bold transition-colors',
                activeLineWidthSize === opt.size
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Custom Color Picker — appears for all drawing tools except those with fixed colors */}
      {activeTool !== 'frame' && activeTool !== 'badge' && activeTool !== 'diagram' && activeTool !== 'comment' && activeTool !== 'sticky' && (
        <>
          <div className="mx-1 h-5 w-px bg-border" />
          <div className="flex items-center gap-1">
            {/* Preset color swatches */}
            <div className="flex items-center gap-0.5">
              {(['blue', 'green', 'amber', 'purple', 'rose', 'gray'] as const).map((colorKey) => {
                const c = WHITEBOARD_COLORS[colorKey];
                const isActive = activeStrokeHex === c.border;
                return (
                  <button
                    key={colorKey}
                    onClick={() => setActiveColor(colorKey)}
                    className={cn(
                      'h-4 w-4 rounded-full border transition-transform hover:scale-110',
                      isActive && 'ring-2 ring-primary ring-offset-1'
                    )}
                    style={{ backgroundColor: c.border }}
                    title={colorKey}
                  />
                );
              })}
            </div>

            {/* Custom hex color pickers for stroke and fill */}
            <div className="relative flex items-center gap-1 border-l pl-1.5">
              <input
                type="color"
                value={activeStrokeHex}
                onChange={(e) => setActiveStrokeHex(e.target.value)}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Custom stroke color"
              />
              <input
                type="color"
                value={activeFillHex === 'transparent' ? '#f8fafc' : activeFillHex}
                onChange={(e) => setActiveFillHex(e.target.value)}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Custom fill color"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
