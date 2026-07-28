'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { cn } from '@/lib/utils';
import type {
  ArrowElement,
  LineElement,
  WhiteboardColor,
  ArrowheadStyle,
  RoutingStyle,
  LineStyle,
} from '@/lib/whiteboard/whiteboard-types';
import type { LineWidthSize } from '@/lib/store/whiteboard-store';

const LINE_WIDTH_OPTIONS: { size: LineWidthSize; label: string; width: number }[] = [
  { size: 'S', label: 'S', width: 1 },
  { size: 'M', label: 'M', width: 2 },
  { size: 'L', label: 'L', width: 4 },
  { size: 'XL', label: 'XL', width: 8 },
];

const ARROWHEAD_STYLE_OPTIONS: { style: ArrowheadStyle; label: string; icon: React.ReactNode }[] = [
  {
    style: 'arrow',
    label: 'Open Arrow',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="8" x2="13" y2="8" />
        <path d="M 9 4 L 13 8 L 9 12" />
      </svg>
    ),
  },
  {
    style: 'triangle',
    label: 'Triangle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="8" x2="8" y2="8" />
        <polygon points="8,4 14,8 8,12" fill="currentColor" />
      </svg>
    ),
  },
  {
    style: 'diamond',
    label: 'Diamond',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="8" x2="7" y2="8" />
        <polygon points="7,8 10,4 14,8 10,12" fill="currentColor" />
      </svg>
    ),
  },
  {
    style: 'circle',
    label: 'Circle',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="8" x2="9" y2="8" />
        <circle cx="11" cy="8" r="3.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    style: 'none',
    label: 'None',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="2" y1="8" x2="14" y2="8" />
      </svg>
    ),
  },
];

type PopupId = 'color' | 'routing' | 'width' | 'lineStyle' | 'startArrowhead' | 'endArrowhead' | 'labelFont' | 'labelSize' | 'labelColor' | 'more' | null;

export function ArrowToolbar() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeColor = useWhiteboardStore((s) => s.activeColor);
  const setActiveColor = useWhiteboardStore((s) => s.setActiveColor);
  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);
  const setActiveStrokeHex = useWhiteboardStore((s) => s.setActiveStrokeHex);
  const activeLineWidthSize = useWhiteboardStore((s) => s.activeLineWidthSize);
  const setActiveLineWidthSize = useWhiteboardStore((s) => s.setActiveLineWidthSize);
  const setActiveStrokeWidth = useWhiteboardStore((s) => s.setActiveStrokeWidth);
  const activeLineStyle = useWhiteboardStore((s) => s.activeLineStyle);
  const setActiveLineStyle = useWhiteboardStore((s) => s.setActiveLineStyle);
  const activeArrowheadStyle = useWhiteboardStore((s) => s.activeArrowheadStyle);
  const setActiveArrowheadStyle = useWhiteboardStore((s) => s.setActiveArrowheadStyle);
  const activeStartArrowheadStyle = useWhiteboardStore((s) => s.activeStartArrowheadStyle);
  const setActiveStartArrowheadStyle = useWhiteboardStore((s) => s.setActiveStartArrowheadStyle);
  const activeRoutingStyle = useWhiteboardStore((s) => s.activeRoutingStyle);
  const setActiveRoutingStyle = useWhiteboardStore((s) => s.setActiveRoutingStyle);
  const activeIsAnimated = useWhiteboardStore((s) => s.activeIsAnimated);
  const setActiveIsAnimated = useWhiteboardStore((s) => s.setActiveIsAnimated);

  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);

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

  const selectedArrows = elements.filter(
    (el) => selectedIds.includes(el.id) && (el.type === 'arrow' || el.type === 'line')
  ) as (ArrowElement | LineElement)[];
  const hasSelectedArrow = selectedArrows.length > 0;
  const firstSelectedArrow = selectedArrows[0] ?? null;

  const isDrawingArrowOrLine = activeTool === 'arrow' || activeTool === 'line';

  // Only show when drawing an arrow/line or when an arrow/line is selected on canvas
  if (!isDrawingArrowOrLine && !hasSelectedArrow) return null;

  const strokeWidthToSize = (w?: number): LineWidthSize => {
    if (!w || w <= 1) return 'S';
    if (w <= 2) return 'M';
    if (w <= 5) return 'L';
    return 'XL';
  };

  const currentStrokeHex = firstSelectedArrow
    ? (firstSelectedArrow.strokeColor || activeStrokeHex)
    : activeStrokeHex;

  const isLine = firstSelectedArrow
    ? firstSelectedArrow.type === 'line'
    : activeTool === 'line';

  const isArrow = firstSelectedArrow
    ? firstSelectedArrow.type === 'arrow'
    : activeTool === 'arrow';

  const currentRoutingStyle = isLine
    ? 'straight'
    : firstSelectedArrow
      ? (firstSelectedArrow.routingStyle || 'orthogonal')
      : activeRoutingStyle;

  const currentLineWidthSize = firstSelectedArrow
    ? strokeWidthToSize(firstSelectedArrow.strokeWidth)
    : activeLineWidthSize;

  const currentStartArrowheadStyle = firstSelectedArrow
    ? (firstSelectedArrow.type === 'arrow' ? (firstSelectedArrow.startArrowheadStyle || 'none') : 'none')
    : activeStartArrowheadStyle;

  const currentArrowheadStyle = firstSelectedArrow
    ? (firstSelectedArrow.type === 'arrow' ? (firstSelectedArrow.arrowheadStyle || 'arrow') : 'none')
    : activeArrowheadStyle;

  const currentLineStyle = firstSelectedArrow
    ? (firstSelectedArrow.lineStyle || 'solid')
    : activeLineStyle;

  const currentIsAnimated = firstSelectedArrow
    ? (firstSelectedArrow.isAnimated || false)
    : activeIsAnimated;

  const handleToggleAnimatedFlow = () => {
    const newAnimated = !currentIsAnimated;
    setActiveIsAnimated(newAnimated);
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { isAnimated: newAnimated });
      });
    }
  };

  const handleSelectColor = (colorKey: WhiteboardColor) => {
    setActiveColor(colorKey);
    const c = WHITEBOARD_COLORS[colorKey];
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { strokeColor: c.border, arrowheadColor: c.border });
      });
    }
    setOpenPopup(null);
  };

  const handleCustomColorChange = (hex: string) => {
    setActiveStrokeHex(hex);
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { strokeColor: hex, arrowheadColor: hex });
      });
    }
  };

  const handleSelectRoutingStyle = (rs: RoutingStyle) => {
    setActiveRoutingStyle(rs);
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, {
          routingStyle: rs,
          isUserRoutingStyle: true,
          waypoint: rs === 'curved' ? el.waypoint : undefined,
        } as any);
      });
    }
    setOpenPopup(null);
  };

  const handleSelectLineWidth = (opt: { size: LineWidthSize; width: number }) => {
    setActiveLineWidthSize(opt.size);
    setActiveStrokeWidth(opt.width);
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { strokeWidth: opt.width });
      });
    }
    setOpenPopup(null);
  };

  const handleSelectStartArrowheadStyle = (style: ArrowheadStyle) => {
    setActiveStartArrowheadStyle(style);
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        if (el.type === 'arrow') {
          updateElement(el.id, { startArrowheadStyle: style });
        }
      });
    }
    setOpenPopup(null);
  };

  const handleSelectEndArrowheadStyle = (style: ArrowheadStyle) => {
    setActiveArrowheadStyle(style);
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        if (el.type === 'arrow') {
          updateElement(el.id, { arrowheadStyle: style });
        }
      });
    }
    setOpenPopup(null);
  };

  const handleSelectLineStyle = (ls: LineStyle) => {
    setActiveLineStyle(ls);
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { lineStyle: ls });
      });
    }
    setOpenPopup(null);
  };

  const hasLabel = hasSelectedArrow && Boolean(firstSelectedArrow?.label && firstSelectedArrow.label.trim().length > 0);
  const currentLabelFontFamily = (firstSelectedArrow as any)?.labelFontFamily ?? 'Inter, sans-serif';
  const currentLabelFontSize = (firstSelectedArrow as any)?.labelFontSize ?? 11;
  const currentLabelColor = (firstSelectedArrow as any)?.labelColor ?? firstSelectedArrow?.strokeColor ?? activeStrokeHex;

  const handleSelectLabelFont = (font: string) => {
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { labelFontFamily: font } as any);
      });
    }
    setOpenPopup(null);
  };

  const handleSelectLabelSize = (size: number) => {
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { labelFontSize: size } as any);
      });
    }
    setOpenPopup(null);
  };

  const handleSelectLabelColor = (hex: string) => {
    if (hasSelectedArrow) {
      selectedArrows.forEach((el) => {
        updateElement(el.id, { labelColor: hex } as any);
      });
    }
  };

  const handleAddLabel = () => {
    if (hasSelectedArrow) {
      const currentLabel = firstSelectedArrow?.label || '';
      const text = window.prompt('Enter arrow label:', currentLabel);
      if (text !== null) {
        selectedArrows.forEach((el) => {
          updateElement(el.id, { label: text });
        });
      }
    }
  };

  const handleDeleteSelected = () => {
    if (hasSelectedArrow) {
      deleteElements(selectedArrows.map((el) => el.id));
    }
    setOpenPopup(null);
  };

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
            <div className="h-4 w-4 rounded-full border border-foreground/20" style={{ backgroundColor: currentStrokeHex }} />
          </button>
          {openPopup === 'color' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-2 shadow-xl backdrop-blur">
              <div className="flex items-center gap-1.5">
                {(['blue', 'green', 'amber', 'purple', 'rose', 'gray'] as const).map((colorKey) => {
                  const c = WHITEBOARD_COLORS[colorKey];
                  return (
                    <button
                      key={colorKey}
                      onClick={() => handleSelectColor(colorKey)}
                      className={cn(
                        'h-5 w-5 rounded-full border transition-transform hover:scale-110',
                        currentStrokeHex === c.border && 'ring-2 ring-primary ring-offset-1'
                      )}
                      style={{ backgroundColor: c.border }}
                      title={colorKey}
                    />
                  );
                })}
                <div className="ml-1 border-l pl-1.5">
                  <input
                    type="color"
                    value={currentStrokeHex}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                    title="Custom color"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Routing Style (Arrows only, lines are compulsory straight) */}
        {isArrow && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="relative">
              <button
                onClick={() => togglePopup('routing')}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
                title={`Routing: ${currentRoutingStyle}`}
              >
                <RoutingIcon style={currentRoutingStyle} />
              </button>
              {openPopup === 'routing' && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur">
                  <div className="flex flex-col gap-0.5">
                    {(['orthogonal', 'curved', 'straight'] as RoutingStyle[]).map((rs) => (
                      <button
                        key={rs}
                        onClick={() => handleSelectRoutingStyle(rs)}
                        className={cn(
                          'flex h-7 items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors',
                          currentRoutingStyle === rs
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
          </>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Line Width S/M/L/XL */}
        <div className="relative">
          <button
            onClick={() => togglePopup('width')}
            className="flex h-8 items-center gap-1 rounded-lg px-2 transition-colors hover:bg-accent"
            title="Line Width"
          >
            <span className="text-xs font-semibold">{currentLineWidthSize}</span>
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
                    onClick={() => handleSelectLineWidth(opt)}
                    className={cn(
                      'flex h-8 items-center gap-3 rounded-md px-3 text-xs font-semibold transition-colors',
                      currentLineWidthSize === opt.size
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

        {/* Arrowheads (Arrows only, lines do not have arrowheads) */}
        {isArrow && (
          <>
            <div className="h-5 w-px bg-border" />

            {/* Start Arrowhead Picker */}
            <div className="relative">
              <button
                onClick={() => togglePopup('startArrowhead')}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors',
                  currentStartArrowheadStyle !== 'none'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                title="Start Arrowhead Style"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 7 4 L 3 8 L 7 12" />
                  <line x1="3" y1="8" x2="14" y2="8" />
                </svg>
                <span className="text-xs font-medium capitalize">{currentStartArrowheadStyle === 'none' ? 'None' : currentStartArrowheadStyle}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 3.5L5 7L8 3.5" />
                </svg>
              </button>
              {openPopup === 'startArrowhead' && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur min-w-[150px]">
                  <div className="text-[10px] font-semibold text-muted-foreground px-2.5 py-1 uppercase tracking-wider">Start Arrowhead</div>
                  <div className="flex flex-col gap-0.5">
                    {ARROWHEAD_STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.style}
                        onClick={() => handleSelectStartArrowheadStyle(opt.style)}
                        className={cn(
                          'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors',
                          currentStartArrowheadStyle === opt.style
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <span className="shrink-0">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* End Arrowhead Picker */}
            <div className="relative">
              <button
                onClick={() => togglePopup('endArrowhead')}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors',
                  currentArrowheadStyle !== 'none'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                title="End Arrowhead Style"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" y1="8" x2="13" y2="8" />
                  <path d="M 9 4 L 13 8 L 9 12" />
                </svg>
                <span className="text-xs font-medium capitalize">{currentArrowheadStyle === 'none' ? 'None' : currentArrowheadStyle}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 3.5L5 7L8 3.5" />
                </svg>
              </button>
              {openPopup === 'endArrowhead' && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur min-w-[150px]">
                  <div className="text-[10px] font-semibold text-muted-foreground px-2.5 py-1 uppercase tracking-wider">End Arrowhead</div>
                  <div className="flex flex-col gap-0.5">
                    {ARROWHEAD_STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.style}
                        onClick={() => handleSelectEndArrowheadStyle(opt.style)}
                        className={cn(
                          'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors',
                          currentArrowheadStyle === opt.style
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <span className="shrink-0">{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
            <LineStyleIcon style={currentLineStyle} />
          </button>
          {openPopup === 'lineStyle' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-0.5">
                {(['solid', 'dashed', 'dotted', 'dash-dot'] as LineStyle[]).map((ls) => (
                  <button
                    key={ls}
                    onClick={() => handleSelectLineStyle(ls)}
                    className={cn(
                      'flex h-7 items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors',
                      currentLineStyle === ls
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

        {/* Animated Flow Toggle */}
        <button
          onClick={handleToggleAnimatedFlow}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
            currentIsAnimated
              ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
          title={currentIsAnimated ? 'Animated Flow: ON' : 'Animated Flow: OFF'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={currentIsAnimated ? 'animate-pulse' : ''}>
            <path d="M2 12h4l3-9 6 17 3-8h4" />
          </svg>
        </button>

        {/* Label button */}
        <button
          onClick={handleAddLabel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Add / Edit Label"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Label Editable Tools (Only visible when selected arrow has a label) */}
        {hasLabel && (
          <>
            <div className="h-5 w-px bg-border" />

            {/* Label Typography / Font Family */}
            <div className="relative">
              <button
                onClick={() => togglePopup('labelFont')}
                className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-accent"
                title="Label Typography"
              >
                <span className="truncate max-w-[70px]">
                  {currentLabelFontFamily.includes('serif') ? 'Serif' : currentLabelFontFamily.includes('mono') ? 'Mono' : currentLabelFontFamily.includes('Caveat') ? 'Hand' : 'Sans'}
                </span>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 3.5L5 7L8 3.5" />
                </svg>
              </button>
              {openPopup === 'labelFont' && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur">
                  <div className="flex flex-col gap-0.5 min-w-[110px]">
                    {[
                      { name: 'Sans-Serif', val: 'Inter, sans-serif' },
                      { name: 'Serif', val: 'Georgia, serif' },
                      { name: 'Monospace', val: "'Courier New', monospace" },
                      { name: 'Handdrawn', val: "'Caveat', cursive, sans-serif" },
                    ].map((f) => (
                      <button
                        key={f.name}
                        onClick={() => handleSelectLabelFont(f.val)}
                        className={cn(
                          'flex h-7 items-center rounded-md px-2 text-xs font-medium transition-colors text-left',
                          currentLabelFontFamily === f.val ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                        )}
                        style={{ fontFamily: f.val }}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Label Font Size */}
            <div className="relative">
              <button
                onClick={() => togglePopup('labelSize')}
                className="flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold transition-colors hover:bg-accent"
                title="Label Font Size"
              >
                <span>{currentLabelFontSize}px</span>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M2 3.5L5 7L8 3.5" />
                </svg>
              </button>
              {openPopup === 'labelSize' && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur">
                  <div className="flex flex-col gap-0.5">
                    {[9, 11, 13, 16, 20, 24].map((sz) => (
                      <button
                        key={sz}
                        onClick={() => handleSelectLabelSize(sz)}
                        className={cn(
                          'flex h-7 items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors',
                          currentLabelFontSize === sz ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                        )}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Label Color */}
            <div className="relative">
              <button
                onClick={() => togglePopup('labelColor')}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
                title="Label Color"
              >
                <div className="h-3.5 w-3.5 rounded-full border border-foreground/20" style={{ backgroundColor: currentLabelColor }} />
              </button>
              {openPopup === 'labelColor' && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-lg border bg-muted/95 p-2 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-1.5">
                    {(['blue', 'green', 'amber', 'purple', 'rose', 'gray'] as const).map((colorKey) => {
                      const c = WHITEBOARD_COLORS[colorKey];
                      return (
                        <button
                          key={colorKey}
                          onClick={() => { handleSelectLabelColor(c.border); setOpenPopup(null); }}
                          className={cn(
                            'h-5 w-5 rounded-full border transition-transform hover:scale-110',
                            currentLabelColor === c.border && 'ring-2 ring-primary ring-offset-1'
                          )}
                          style={{ backgroundColor: c.border }}
                          title={colorKey}
                        />
                      );
                    })}
                    <div className="ml-1 border-l pl-1.5">
                      <input
                        type="color"
                        value={currentLabelColor}
                        onChange={(e) => handleSelectLabelColor(e.target.value)}
                        className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                        title="Custom label color"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

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
                <button className="rounded-md px-2 py-1 text-left text-destructive hover:bg-destructive/10" onClick={handleDeleteSelected}>
                  Delete
                </button>
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
