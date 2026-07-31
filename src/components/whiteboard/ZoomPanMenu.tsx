'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import {
  ChevronDown,
  Minus,
  Plus,
  Hand,
  Maximize,
  Focus,
  ZoomIn,
  EyeOff,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WhiteboardTool } from '@/lib/whiteboard/whiteboard-types';

interface ZoomPanMenuProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFitContent: () => void;
  onZoomFitSelection: () => void;
  onZoomReset: () => void;
  activeTool: WhiteboardTool;
  onToggleHandTool: () => void;
  hideUI: boolean;
  onToggleHideUI: () => void;
}

export function ZoomPanMenu({
  scale,
  onZoomIn,
  onZoomOut,
  onZoomFitContent,
  onZoomFitSelection,
  onZoomReset,
  activeTool,
  onToggleHandTool,
  hideUI,
  onToggleHideUI,
}: ZoomPanMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomPercent = Math.round(scale * 100);

  // Close menu on click outside via reusable hook
  useOnClickOutside(
    containerRef,
    useCallback(() => setIsOpen(false), []),
    isOpen
  );

  return (
    <>
      {/* Top-Right Eraser.io Zoom & View Options Dropdown Trigger */}
      {!hideUI && (
        <div ref={containerRef} className="absolute top-4 right-4 z-40">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-8 items-center gap-1.5 rounded-lg border bg-muted/90 px-2.5 text-xs font-semibold shadow-md backdrop-blur transition-colors hover:bg-accent"
            title="Zoom and view options"
          >
            <span>{zoomPercent}%</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border bg-muted/95 p-2 shadow-2xl backdrop-blur z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95">
              {/* Stepper Header Bar: [-]  100%  [+] */}
              <div className="flex items-center justify-between border-b pb-2 px-1">
                <button
                  onClick={onZoomOut}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Zoom Out (-)"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs font-bold text-foreground">
                  {zoomPercent}%
                </span>
                <button
                  onClick={onZoomIn}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Zoom In (+)"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex flex-col gap-0.5 pt-1">
                {/* Hand */}
                <button
                  onClick={() => {
                    onToggleHandTool();
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex h-8 items-center justify-between rounded-lg px-2.5 text-xs font-medium transition-colors',
                    activeTool === 'hand'
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Hand className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Hand</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Space
                  </span>
                </button>

                {/* Zoom to fit */}
                <button
                  onClick={() => {
                    onZoomFitContent();
                    setIsOpen(false);
                  }}
                  className="flex h-8 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Maximize className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Zoom to fit</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ⇧ 1
                  </span>
                </button>

                {/* Zoom to selection */}
                <button
                  onClick={() => {
                    onZoomFitSelection();
                    setIsOpen(false);
                  }}
                  className="flex h-8 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Focus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Zoom to selection</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ⇧ 2
                  </span>
                </button>

                {/* Zoom to 100% */}
                <button
                  onClick={() => {
                    onZoomReset();
                    setIsOpen(false);
                  }}
                  className="flex h-8 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Zoom to 100%</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Ctrl 0
                  </span>
                </button>

                {/* Hide UI */}
                <button
                  onClick={() => {
                    onToggleHideUI();
                    setIsOpen(false);
                  }}
                  className="flex h-8 items-center justify-between rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Hide UI</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Ctrl \
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Show UI button when UI is hidden */}
      {hideUI && (
        <button
          onClick={onToggleHideUI}
          className="absolute top-4 right-4 z-50 flex h-8 items-center gap-1.5 rounded-lg border bg-muted/90 px-3 text-xs font-semibold shadow-xl backdrop-blur transition-all hover:bg-accent"
          title="Show UI (Ctrl + \)"
        >
          <Eye className="h-3.5 w-3.5 text-primary" />
          <span>Show UI</span>
        </button>
      )}
    </>
  );
}
