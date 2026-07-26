'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { cn } from '@/lib/utils';
import type { ArrowheadStyle, RoutingStyle, LineStyle } from '@/lib/whiteboard/whiteboard-types';
import type { LineWidthSize } from '@/lib/store/whiteboard-store';

const LINE_WIDTH_OPTIONS: { size: LineWidthSize; label: string; width: number }[] = [
  { size: 'S', label: 'S', width: 1 },
  { size: 'M', label: 'M', width: 2 },
  { size: 'L', label: 'L', width: 4 },
  { size: 'XL', label: 'XL', width: 8 },
];

type PopupId = 'color' | 'routing' | 'width' | 'lineStyle' | 'more' | null;

export function ArrowToolbar() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeColor = useWhiteboardStore((s) => s.activeColor);
  const setActiveColor = useWhiteboardStore((s) => s.setActiveColor);
  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);
  const activeLineWidthSize = useWhiteboardStore((s) => s.activeLineWidthSize);
  const setActiveLineWidthSize = useWhiteboardStore((s) => s.setActiveLineWidthSize);
  const activeLineStyle = useWhiteboardStore((s) => s.activeLineStyle);
  const setActiveLineStyle = useWhiteboardStore((s) => s.setActiveLineStyle);
  const activeArrowheadStyle = useWhiteboardStore((s) => s.activeArrowheadStyle);
  const setActiveArrowheadStyle = useWhiteboardStore((s) => s.setActiveArrowheadStyle);
  const activeStartArrowheadStyle = useWhiteboardStore((s) => s.activeStartArrowheadStyle);
  const setActiveStartArrowheadStyle = useWhiteboardStore((s) => s.setActiveStartArrowheadStyle);
  const activeRoutingStyle = useWhiteboardStore((s) => s.activeRoutingStyle);
  const setActiveRoutingStyle = useWhiteboardStore((s) => s.setActiveRoutingStyle);

  const [openPopup, setOpenPopup] = useState<PopupId>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to dismiss popups
  useEffect(() => {
    if (!openPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [openPopup]);

  const togglePopup = (id: PopupId) => {
    setOpenPopup((prev) => (prev === id ? null : id));
  };

  // Only show when arrow or line tool is active
  if (activeTool !== 'arrow' && activeTool !== 'line') return null;

  const isArrowTool = activeTool === 'arrow';

  return (
    <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200" ref={containerRef}>
      <div className="flex items-center gap-1 rounded-xl border bg-muted/95 p-1.5 shadow-2xl backdrop-blur">
        {/* Color Picker */}
        <div className="relative">
          <button
            onClick={() => togglePopup('color')}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            title="Color"
          >
            <div className="h-4 w-4 rounded-full border border-foreground/20" style={{ backgroundColor: activeStrokeHex }} />
          </button>
          {openPopup === 'color' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-2 shadow-xl backdrop-blur">
              <div className="flex items-center gap-1.5">
                {(['blue', 'green', 'amber', 'purple', 'rose', 'gray'] as const).map((colorKey) => {
                  const c = WHITEBOARD_COLORS[colorKey];
                  return (
                    <button
                      key={colorKey}
                      onClick={() => { setActiveColor(colorKey); setOpenPopup(null); }}
                      className={cn(
                        'h-5 w-5 rounded-full border transition-transform hover:scale-110',
                        activeColor === colorKey && 'ring-2 ring-primary ring-offset-1'
                      )}
                      style={{ backgroundColor: c.border }}
                      title={colorKey}
                    />
                  );
                })}
                <div className="ml-1 border-l pl-1.5">
                  <input
                    type="color"
                    value={activeStrokeHex}
                    onChange={(e) => useWhiteboardStore.getState().setActiveStrokeHex(e.target.value)}
                    className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Routing Style */}
        <div className="relative">
          <button
            onClick={() => togglePopup('routing')}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            title={`Routing: ${activeRoutingStyle}`}
          >
            <RoutingIcon style={activeRoutingStyle} />
          </button>
          {openPopup === 'routing' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-0.5">
                {(['orthogonal', 'curved', 'straight'] as RoutingStyle[]).map((rs) => (
                  <button
                    key={rs}
                    onClick={() => { setActiveRoutingStyle(rs); setOpenPopup(null); }}
                    className={cn(
                      'flex h-7 items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors',
                      activeRoutingStyle === rs
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <RoutingIcon style={rs} className="h-3.5 w-3.5" />
                    <span className="capitalize">{rs}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Line Width S/M/L/XL */}
        <div className="relative">
          <button
            onClick={() => togglePopup('width')}
            className="flex h-8 items-center gap-1 rounded-lg px-2 transition-colors hover:bg-accent"
            title="Line Width"
          >
            <span className="text-xs font-semibold">{activeLineWidthSize}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 3.5L5 7L8 3.5" />
            </svg>
          </button>
          {openPopup === 'width' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-0.5">
                {LINE_WIDTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.size}
                    onClick={() => { setActiveLineWidthSize(opt.size); setOpenPopup(null); }}
                    className={cn(
                      'flex h-8 items-center gap-3 rounded-md px-3 text-xs font-semibold transition-colors',
                      activeLineWidthSize === opt.size
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <span className="w-4 text-center">{opt.label}</span>
                    <div className="w-16 rounded-full bg-current" style={{ height: Math.max(2, opt.width) }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isArrowTool && (
          <>
            <div className="h-5 w-px bg-border" />

            {/* Bidirectional Arrows - Start Arrowhead */}
            <button
              onClick={() => {
                const newStyle = activeStartArrowheadStyle === 'none' ? 'arrow' : 'none';
                setActiveStartArrowheadStyle(newStyle);
              }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                activeStartArrowheadStyle !== 'none'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={activeStartArrowheadStyle !== 'none' ? 'Start arrowhead: ON' : 'Start arrowhead: OFF'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4,4 8,8 4,12" />
                <line x1="4" y1="8" x2="14" y2="8" />
              </svg>
            </button>

            {/* End Arrowhead */}
            <button
              onClick={() => {
                const newStyle = activeArrowheadStyle === 'none' ? 'arrow' : 'none';
                setActiveArrowheadStyle(newStyle);
              }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                activeArrowheadStyle !== 'none'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={activeArrowheadStyle !== 'none' ? 'End arrowhead: ON' : 'End arrowhead: OFF'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="12,4 8,8 12,12" />
                <line x1="2" y1="8" x2="12" y2="8" />
              </svg>
            </button>
          </>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Line Style */}
        <div className="relative">
          <button
            onClick={() => togglePopup('lineStyle')}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            title="Line Style"
          >
            <LineStyleIcon style={activeLineStyle} />
          </button>
          {openPopup === 'lineStyle' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-0.5">
                {(['solid', 'dashed', 'dotted', 'dash-dot'] as LineStyle[]).map((ls) => (
                  <button
                    key={ls}
                    onClick={() => { setActiveLineStyle(ls); setOpenPopup(null); }}
                    className={cn(
                      'flex h-7 items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors',
                      activeLineStyle === ls
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <LineStyleIcon style={ls} className="h-3 w-4" />
                    <span className="capitalize">{ls === 'dash-dot' ? 'dash·dot' : ls}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Label button */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Add Label"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* More Options */}
        <div className="relative">
          <button
            onClick={() => togglePopup('more')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="More Options"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="13" cy="8" r="1.5" />
            </svg>
          </button>
          {openPopup === 'more' && (
            <div className="absolute bottom-full right-0 mb-2 rounded-lg border bg-muted/95 p-2 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-1 text-xs">
                <button className="rounded-md px-2 py-1 text-left hover:bg-accent">Copy Style</button>
                <button className="rounded-md px-2 py-1 text-left hover:bg-accent">Paste Style</button>
                <div className="h-px bg-border" />
                <button className="rounded-md px-2 py-1 text-left text-destructive hover:bg-destructive/10">Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Inline SVG Icons ---

function RoutingIcon({ style, className }: { style: RoutingStyle; className?: string }) {
  const cls = className || 'h-4 w-4';
  if (style === 'orthogonal') {
    return (
      <svg className={cls} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4 L2 12 L14 12" />
      </svg>
    );
  }
  if (style === 'curved') {
    return (
      <svg className={cls} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 13 C2 3, 14 3, 14 8" />
      </svg>
    );
  }
  // straight
  return (
    <svg className={cls} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="2" y1="14" x2="14" y2="2" />
    </svg>
  );
}

function LineStyleIcon({ style, className }: { style: LineStyle; className?: string }) {
  const cls = className || 'h-4 w-4';
  if (style === 'solid') {
    return (
      <svg className={cls} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    );
  }
  if (style === 'dashed') {
    return (
      <svg className={cls} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3">
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    );
  }
  if (style === 'dotted') {
    return (
      <svg className={cls} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 3">
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    );
  }
  // dash-dot
  return (
    <svg className={cls} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 3 1.5 3">
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  );
}
