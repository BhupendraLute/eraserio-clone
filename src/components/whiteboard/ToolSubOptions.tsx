'use client';

import React from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
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

  // Arrow/line tools use ArrowToolbar (bottom bar) instead
  if (activeTool === 'select') return null;
  if (activeTool === 'arrow' || activeTool === 'line') return null;

  return (
    <div className="absolute top-full left-0 mt-1 z-50 flex items-center gap-1.5 rounded-lg border bg-muted/90 p-1.5 shadow-lg backdrop-blur animate-in fade-in zoom-in-95">
      {/* Rectangle sub-options: corner radius + fill */}
      {activeTool === 'rectangle' && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Radius</span>
          {[0, 4, 8, 12, 20].map((r) => (
            <button
              key={r}
              onClick={() => setActiveCornerRadius(r)}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-medium transition-colors',
                activeCornerRadius === r
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={`${r}px radius`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1" y="1" width="12" height="12" rx={r / 2} />
              </svg>
            </button>
          ))}
          <div className="mx-1 h-5 w-px bg-border" />

          {/* Fill toggle */}
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Fill</span>
            <button
              onClick={() => setActiveFillHex(activeFillHex === 'transparent' ? activeStrokeHex + '33' : 'transparent')}
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium transition-colors',
                activeFillHex === 'transparent'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <div className="h-3 w-3 rounded-sm border border-current" style={{
                backgroundColor: activeFillHex !== 'transparent' ? activeFillHex : undefined
              }} />
              <span>{activeFillHex === 'transparent' ? 'Outline' : 'Filled'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Circle / Diamond / Cylinder sub-options: fill toggle */}
      {(activeTool === 'circle' || activeTool === 'diamond' || activeTool === 'cylinder') && (
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Fill</span>
            <button
              onClick={() => setActiveFillHex(activeFillHex === 'transparent' ? activeStrokeHex + '33' : 'transparent')}
              className={cn(
                'flex h-6 items-center gap-1 rounded-md px-1.5 text-[10px] font-medium transition-colors',
                activeFillHex === 'transparent'
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <div className="h-3 w-3 rounded-sm border border-current" style={{
                backgroundColor: activeFillHex !== 'transparent' ? activeFillHex : undefined
              }} />
              <span>{activeFillHex === 'transparent' ? 'Outline' : 'Filled'}</span>
            </button>
          </div>
        </div>
      )}

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
