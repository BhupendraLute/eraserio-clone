'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import { WHITEBOARD_COLORS, isPolygonShapeType, STROKE_COLOR_PALETTE, FILL_COLOR_PALETTE } from '@/lib/whiteboard/whiteboard-types';
import { cn } from '@/lib/utils';
import type {
  WhiteboardElement,
  LineStyle,
  FillStyleMode,
  WhiteboardTool,
} from '@/lib/whiteboard/whiteboard-types';
import type { LineWidthSize } from '@/lib/store/whiteboard-store';
import { LabelTypographyToolbar } from './LabelTypographyToolbar';
import { ColorSwatchGrid } from '@/components/whiteboard/ui/ColorSwatchGrid';

const LINE_WIDTH_OPTIONS: { size: LineWidthSize; label: string; width: number }[] = [
  { size: 'S', label: 'S', width: 1 },
  { size: 'M', label: 'M', width: 2 },
  { size: 'L', label: 'L', width: 4 },
  { size: 'XL', label: 'XL', width: 8 },
];

const SHAPE_GRID_OPTIONS: { type: string; label: string; icon: React.ReactNode }[] = [
  // Row 1
  {
    type: 'rectangle',
    label: 'Rectangle',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="4" width="16" height="12" rx="3" />
      </svg>
    ),
  },
  {
    type: 'circle',
    label: 'Circle',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="10" cy="10" r="7.5" />
      </svg>
    ),
  },
  {
    type: 'diamond',
    label: 'Diamond',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="10,2 18,10 10,18 2,10" />
      </svg>
    ),
  },
  {
    type: 'triangle',
    label: 'Triangle',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="10,3 18,17 2,17" />
      </svg>
    ),
  },
  // Row 2
  {
    type: 'capsule',
    label: 'Capsule',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="6" width="16" height="8" rx="4" />
      </svg>
    ),
  },
  {
    type: 'parallelogram',
    label: 'Parallelogram',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="6,4 18,4 14,16 2,16" />
      </svg>
    ),
  },
  {
    type: 'trapezoid',
    label: 'Trapezoid',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="5,4 15,4 18,16 2,16" />
      </svg>
    ),
  },
  {
    type: 'cylinder',
    label: 'Cylinder',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="10" cy="5" rx="7" ry="2.5" />
        <path d="M 3 5 L 3 15 A 7 2.5 0 0 0 17 15 L 17 5" />
      </svg>
    ),
  },
  // Row 3
  {
    type: 'square',
    label: 'Square',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" />
      </svg>
    ),
  },
  {
    type: 'hexagon',
    label: 'Hexagon',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="5,3 15,3 19,10 15,17 5,17 1,10" />
      </svg>
    ),
  },
  {
    type: 'star',
    label: 'Star',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="10,2 12.4,7.2 18,7.9 13.8,11.8 15,17.3 10,14.4 5,17.3 6.2,11.8 2,7.9 7.6,7.2" />
      </svg>
    ),
  },
];

type PopupId = 'shape' | 'fill' | 'stroke' | 'fontSize' | 'typography' | 'more' | null;

export function ShapeToolbar() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const bringToFront = useWhiteboardStore((s) => s.bringToFront);
  const sendToBack = useWhiteboardStore((s) => s.sendToBack);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);

  const activeColor = useWhiteboardStore((s) => s.activeColor);
  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);
  const setActiveStrokeHex = useWhiteboardStore((s) => s.setActiveStrokeHex);
  const activeFillHex = useWhiteboardStore((s) => s.activeFillHex);
  const setActiveFillHex = useWhiteboardStore((s) => s.setActiveFillHex);
  const activeLineWidthSize = useWhiteboardStore((s) => s.activeLineWidthSize);
  const setActiveLineWidthSize = useWhiteboardStore((s) => s.setActiveLineWidthSize);
  const setActiveStrokeWidth = useWhiteboardStore((s) => s.setActiveStrokeWidth);
  const activeLineStyle = useWhiteboardStore((s) => s.activeLineStyle);
  const setActiveLineStyle = useWhiteboardStore((s) => s.setActiveLineStyle);
  const activeFillStyle = useWhiteboardStore((s) => s.activeFillStyle);
  const setActiveFillStyle = useWhiteboardStore((s) => s.setActiveFillStyle);

  const [openPopup, setOpenPopup] = useState<PopupId>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to dismiss popups via reusable hook
  useOnClickOutside(
    containerRef,
    useCallback(() => setOpenPopup(null), []),
    Boolean(openPopup)
  );

  const togglePopup = (id: PopupId) => {
    setOpenPopup((prev) => (prev === id ? null : id));
  };

  const selectedShapes = elements.filter(
    (el) => selectedIds.includes(el.id) && isPolygonShapeType(el.type)
  );
  const hasSelectedShape = selectedShapes.length > 0;
  const firstSelectedShape = selectedShapes[0] ?? null;

  const isDrawingShape = isPolygonShapeType(activeTool);

  // Only show when drawing a shape or when shape(s) are selected on canvas
  if (!isDrawingShape && !hasSelectedShape) return null;

  const strokeWidthToSize = (w?: number): LineWidthSize => {
    if (!w || w <= 1) return 'S';
    if (w <= 2) return 'M';
    if (w <= 5) return 'L';
    return 'XL';
  };

  const currentShapeType = firstSelectedShape
    ? firstSelectedShape.type
    : (isDrawingShape ? activeTool : 'rectangle');

  const currentStrokeHex = firstSelectedShape
    ? (firstSelectedShape.strokeColor || activeStrokeHex)
    : activeStrokeHex;

  const currentFillHex = firstSelectedShape
    ? (firstSelectedShape.fillColor ?? activeFillHex)
    : activeFillHex;

  const currentLineStyle: LineStyle = firstSelectedShape
    ? (firstSelectedShape.lineStyle || 'solid')
    : activeLineStyle;

  const currentFillStyle: FillStyleMode = firstSelectedShape
    ? (firstSelectedShape.fillStyle || activeFillStyle)
    : activeFillStyle;

  const hasLabel = selectedShapes.some((el) => Boolean(el.label && el.label.trim() !== ''));

  const currentLineWidthSize = firstSelectedShape
    ? strokeWidthToSize(firstSelectedShape.strokeWidth)
    : activeLineWidthSize;

  const handleSelectShape = (newType: string) => {
    setActiveTool(newType as WhiteboardTool);
    if (hasSelectedShape) {
      selectedShapes.forEach((el) => {
        updateElement(el.id, { type: newType as WhiteboardElement['type'] });
      });
    }
    setOpenPopup(null);
  };

  const handleSelectFillStyleMode = (mode: FillStyleMode) => {
    setActiveFillStyle(mode);
    if (hasSelectedShape) {
      selectedShapes.forEach((el) => {
        updateElement(el.id, { fillStyle: mode });
      });
    }
  };

  const getBaseFillColor = (hex: string): string => {
    if (!hex || hex === 'transparent') {
      return WHITEBOARD_COLORS[activeColor]?.bg || '#3b82f6';
    }
    if (hex.startsWith('#') && hex.length === 9) {
      return hex.slice(0, 7);
    }
    return hex;
  };

  const handleSelectFillHex = (hex: string) => {
    let targetHex = hex;
    const isCurrentlySoft = currentFillHex !== 'transparent' && currentFillHex.length === 9;
    if (hex !== 'transparent' && isCurrentlySoft && hex.length === 7) {
      targetHex = hex + '33';
    }
    setActiveFillHex(targetHex);
    if (hasSelectedShape) {
      selectedShapes.forEach((el) => {
        updateElement(el.id, { fillColor: targetHex });
      });
    }
  };

  const handleSelectLineStyle = (ls: LineStyle) => {
    setActiveLineStyle(ls);
    if (hasSelectedShape) {
      selectedShapes.forEach((el) => {
        updateElement(el.id, { lineStyle: ls });
      });
    }
  };

  const handleSelectLineWidth = (opt: { size: LineWidthSize; width: number }) => {
    setActiveLineWidthSize(opt.size);
    setActiveStrokeWidth(opt.width);
    if (hasSelectedShape) {
      selectedShapes.forEach((el) => {
        updateElement(el.id, { strokeWidth: opt.width });
      });
    }
  };

  const handleSelectStrokeHex = (hex: string) => {
    setActiveStrokeHex(hex);
    if (hasSelectedShape) {
      selectedShapes.forEach((el) => {
        updateElement(el.id, { strokeColor: hex });
      });
    }
  };

  const handleAddLabel = () => {
    if (hasSelectedShape) {
      const currentLabel = firstSelectedShape?.label || '';
      const text = window.prompt('Enter shape label:', currentLabel);
      if (text !== null) {
        selectedShapes.forEach((el) => {
          updateElement(el.id, { label: text });
        });
      }
    }
  };

  const handleDeleteSelected = () => {
    if (hasSelectedShape) {
      deleteElements(selectedShapes.map((el) => el.id));
    }
    setOpenPopup(null);
  };

  const currentShapeIcon = SHAPE_GRID_OPTIONS.find((s) => s.type === currentShapeType)?.icon ?? SHAPE_GRID_OPTIONS[0].icon;

  return (
    <div
      className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200"
      ref={containerRef}
    >
      <div className="flex items-center gap-1 rounded-xl border bg-muted/95 p-1.5 shadow-2xl backdrop-blur">
        {/* 1. Shape Switcher Dropdown (matching Screenshot 1) */}
        <div className="relative">
          <button
            onClick={() => togglePopup('shape')}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg px-2 text-foreground transition-colors hover:bg-accent',
              openPopup === 'shape' && 'bg-accent'
            )}
            title="Change Shape"
          >
            <span className="shrink-0">{currentShapeIcon}</span>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 3.5L5 7L8 3.5" />
            </svg>
          </button>

          {openPopup === 'shape' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-xl border bg-muted/95 p-2.5 shadow-2xl backdrop-blur min-w-[210px] animate-in fade-in zoom-in-95">
              <div className="grid grid-cols-4 gap-1.5">
                {SHAPE_GRID_OPTIONS.map((opt) => {
                  const isSelected = currentShapeType === opt.type;
                  return (
                    <button
                      key={opt.type}
                      onClick={() => handleSelectShape(opt.type)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-accent',
                        isSelected ? 'bg-primary/20 text-primary ring-1 ring-primary/40' : 'text-muted-foreground hover:text-foreground'
                      )}
                      title={opt.label}
                    >
                      {opt.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* 2. Fill & Style Popover (matching Screenshot 3) */}
        <div className="relative">
          <button
            onClick={() => togglePopup('fill')}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg px-2 text-foreground transition-colors hover:bg-accent',
              openPopup === 'fill' && 'bg-accent'
            )}
            title="Fill & Background Style"
          >
            <div className="relative h-4 w-4 rounded-full border border-foreground/30 flex items-center justify-center overflow-hidden" style={{ backgroundColor: currentFillHex === 'transparent' ? 'transparent' : currentFillHex }}>
              {currentFillHex === 'transparent' && <div className="absolute h-[1.5px] w-full bg-red-500 rotate-45" />}
            </div>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 3.5L5 7L8 3.5" />
            </svg>
          </button>

          {openPopup === 'fill' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 flex items-start gap-2 animate-in fade-in zoom-in-95">
              {/* Left Card: Fill Mode Icons & 2x4 Color Swatches Grid */}
              <div className="rounded-xl border bg-muted/95 p-3 shadow-2xl backdrop-blur flex flex-col gap-2.5 min-w-[190px] shrink-0">
                {/* Top Fill Mode Icons */}
                <div className="flex items-center gap-1.5 justify-between border-b pb-2">
                  {[
                    { mode: 'solid', icon: <circle cx="8" cy="8" r="6" fill="currentColor" /> },
                    { mode: 'soft', icon: <circle cx="8" cy="8" r="6" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1.2" /> },
                    { mode: 'outline', icon: <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
                    {
                      mode: 'transparent',
                      icon: (
                        <g stroke="currentColor" strokeWidth="1.5">
                          <circle cx="8" cy="8" r="5.5" fill="none" />
                          <line x1="3" y1="13" x2="13" y2="3" stroke="#ef4444" />
                        </g>
                      ),
                    },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      onClick={() => {
                        if (item.mode === 'transparent' || item.mode === 'outline') {
                          handleSelectFillHex('transparent');
                        } else if (item.mode === 'soft') {
                          const base = getBaseFillColor(currentFillHex);
                          handleSelectFillHex(base + '33');
                        } else {
                          const base = getBaseFillColor(currentFillHex);
                          handleSelectFillHex(base);
                        }
                      }}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent',
                        ((item.mode === 'transparent' || item.mode === 'outline') && currentFillHex === 'transparent') ||
                          (item.mode === 'soft' && currentFillHex !== 'transparent' && currentFillHex.endsWith('33')) ||
                          (item.mode === 'solid' && currentFillHex !== 'transparent' && !currentFillHex.endsWith('33'))
                          ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      title={item.mode}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16">
                        {item.icon}
                      </svg>
                    </button>
                  ))}
                </div>

                {/* 2x4 Color Swatches Grid */}
                <ColorSwatchGrid
                  palette={FILL_COLOR_PALETTE}
                  currentColor={currentFillHex}
                  onSelectColor={handleSelectFillHex}
                />
              </div>

              {/* Right Card: Style Options (Plain, Shadow, Watercolor) */}
              <div className="rounded-xl border bg-muted/95 p-3 shadow-2xl backdrop-blur flex flex-col gap-1.5 min-w-[130px] shrink-0">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Style
                </div>
                {[
                  { mode: 'plain', label: 'Plain' },
                  { mode: 'watercolor', label: 'Watercolor' },
                ].map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => handleSelectFillStyleMode(opt.mode as FillStyleMode)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors text-left',
                      currentFillStyle === opt.mode
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <div className={cn('h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center', currentFillStyle === opt.mode && 'border-primary-foreground')}>
                      {currentFillStyle === opt.mode && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                    </div>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* 3. Stroke & Line Style / Width Popover (matching Screenshot 2) */}
        <div className="relative">
          <button
            onClick={() => togglePopup('stroke')}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-lg px-2 text-foreground transition-colors hover:bg-accent',
              openPopup === 'stroke' && 'bg-accent'
            )}
            title="Stroke Style & Width"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="2" y1="4" x2="14" y2="4" strokeWidth="1" />
              <line x1="2" y1="8" x2="14" y2="8" strokeWidth="2" />
              <line x1="2" y1="12" x2="14" y2="12" strokeWidth="3" />
            </svg>
            <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 3.5L5 7L8 3.5" />
            </svg>
          </button>

          {openPopup === 'stroke' && (
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 flex items-start gap-2 animate-in fade-in zoom-in-95">
              {/* Left Card: Line Style & Width Presets */}
              <div className="rounded-xl border bg-muted/95 p-3 shadow-2xl backdrop-blur flex flex-col gap-2.5 min-w-[140px] shrink-0">
                {/* Line Style Toggle */}
                <div className="flex items-center gap-1 border-b pb-2 justify-between">
                  {(['solid', 'dashed', 'dotted'] as LineStyle[]).map((ls) => (
                    <button
                      key={ls}
                      onClick={() => handleSelectLineStyle(ls)}
                      className={cn(
                        'flex h-7 w-8 items-center justify-center rounded-md text-xs transition-colors',
                        currentLineStyle === ls
                          ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                      title={ls}
                    >
                      <div
                        className="w-5 border-b-2"
                        style={{
                          borderStyle: ls === 'solid' ? 'solid' : ls === 'dashed' ? 'dashed' : 'dotted',
                          borderColor: 'currentColor',
                        }}
                      />
                    </button>
                  ))}
                </div>

                {/* Line Width List S/M/L/XL */}
                <div className="flex flex-col gap-1">
                  {LINE_WIDTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.size}
                      onClick={() => handleSelectLineWidth(opt)}
                      className={cn(
                        'flex h-7 items-center gap-3 rounded-md px-2 text-xs font-bold transition-colors',
                        currentLineWidthSize === opt.size
                          ? 'bg-primary/20 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <span className="w-4 text-center">{opt.label}</span>
                      <div className="w-16 rounded-full bg-current" style={{ height: Math.max(1.5, opt.width) }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Card: Stroke Color Swatches Grid */}
              <div className="rounded-xl border bg-muted/95 p-3 shadow-2xl backdrop-blur flex flex-col gap-2.5 min-w-[150px] shrink-0">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Border Color
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {/* Theme Default Swatch (Whitish Gray in dark mode, Dark Gray in light mode) */}
                  <button
                    onClick={() => handleSelectStrokeHex('currentColor')}
                    className={cn(
                      'h-6 w-6 rounded-md border shrink-0 transition-transform hover:scale-110 bg-foreground flex items-center justify-center',
                      (currentStrokeHex === 'currentColor' || !currentStrokeHex) && 'ring-2 ring-primary ring-offset-1'
                    )}
                    title="Theme Default (Whitish Gray in dark, Dark Gray in light)"
                  />

                  {STROKE_COLOR_PALETTE.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => handleSelectStrokeHex(hex)}
                      className={cn(
                        'h-6 w-6 rounded-md border shrink-0 transition-transform hover:scale-110',
                        currentStrokeHex === hex && 'ring-2 ring-primary ring-offset-1'
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}

                  {/* Custom Hex Color Picker */}
                  <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-gradient-to-br from-red-500 via-green-500 to-blue-500 overflow-hidden cursor-pointer">
                    <input
                      type="color"
                      value={currentStrokeHex}
                      onChange={(e) => handleSelectStrokeHex(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      title="Custom border color"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* 4. Add / Edit Label button */}
        <button
          onClick={handleAddLabel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Add / Edit Label"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* 5. Label Typography & Font Size Controls (Only visible when selected shape has a label) */}
        {hasLabel && (
          <LabelTypographyToolbar
            selectedElements={selectedShapes}
            openPopup={openPopup}
            togglePopup={togglePopup}
            setOpenPopup={setOpenPopup}
          />
        )}

        {/* 5. More Options */}
        <div className="relative">
          <button
            onClick={() => togglePopup('more')}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              openPopup === 'more' && 'bg-accent text-foreground'
            )}
            title="More Options"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="13" cy="8" r="1.5" />
            </svg>
          </button>
          {openPopup === 'more' && (
            <div className="absolute bottom-full right-0 mb-2 rounded-lg border bg-muted/95 p-1.5 shadow-xl backdrop-blur min-w-[130px]">
              <div className="flex flex-col gap-0.5 text-xs font-medium">
                <button
                  className="rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
                  onClick={() => { duplicateSelected(); setOpenPopup(null); }}
                >
                  Duplicate
                </button>
                <button
                  className="rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
                  onClick={() => { bringToFront(); setOpenPopup(null); }}
                >
                  Bring to Front
                </button>
                <button
                  className="rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
                  onClick={() => { sendToBack(); setOpenPopup(null); }}
                >
                  Send to Back
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  className="rounded-md px-2.5 py-1.5 text-left text-destructive transition-colors hover:bg-destructive/10"
                  onClick={handleDeleteSelected}
                >
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
