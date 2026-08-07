'use client';

import React, { useEffect, useCallback } from 'react';
import { useAiChatStore } from '@/lib/store/ai-chat-store';
import { Button } from '@/components/ui/button';
import { WhiteboardElements } from '@/components/whiteboard/WhiteboardElements';
import { getElementBounds } from '@/lib/whiteboard/whiteboard-types';
import { usePanZoom } from '@/lib/hooks/usePanZoom';
import {
  Sparkles,
  Check,
  MessageSquare,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

export function AiDiagramPreviewModal() {
  const activePreviewDsl = useAiChatStore((s) => s.activePreviewDsl);
  const activePreviewElements = useAiChatStore((s) => s.activePreviewElements);
  const acceptPreviewChanges = useAiChatStore((s) => s.acceptPreviewChanges);
  const rejectPreviewChanges = useAiChatStore((s) => s.rejectPreviewChanges);

  const focusDiagramRef = React.useRef<(() => void) | null>(null);

  const {
    transform,
    containerRef,
    handlers,
    zoomIn,
    zoomOut,
    reset,
    setTransform,
  } = usePanZoom({
    initial: { scale: 1.0, x: 40, y: 40 },
    enableKeyboardShortcuts: true,
    onReset: () => focusDiagramRef.current?.(),
  });

  const focusDiagram = useCallback(() => {
    if (activePreviewElements.length === 0) {
      setTransform({ scale: 1.0, x: 40, y: 40 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    activePreviewElements.forEach((el) => {
      const b = getElementBounds(el);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.width > maxX) maxX = b.x + b.width;
      if (b.y + b.height > maxY) maxY = b.y + b.height;
    });

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      setTransform({ scale: 1.0, x: 40, y: 40 });
      return;
    }

    const container = containerRef.current;
    const viewportWidth = container?.clientWidth || 1000;
    const viewportHeight = container?.clientHeight || 600;

    const contentWidth = Math.max(maxX - minX, 20);
    const contentHeight = Math.max(maxY - minY, 20);

    const padding = 60;
    const availableWidth = Math.max(viewportWidth - padding * 2, 100);
    const availableHeight = Math.max(viewportHeight - padding * 2, 100);

    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;

    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);

    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    const x = viewportWidth / 2 - contentCenterX * scale;
    const y = viewportHeight / 2 - contentCenterY * scale;

    setTransform({ scale, x, y });
  }, [activePreviewElements, containerRef, setTransform]);

  focusDiagramRef.current = focusDiagram;

  const diagramBounds = React.useMemo(() => {
    if (activePreviewElements.length === 0) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    activePreviewElements.forEach((el) => {
      const b = getElementBounds(el);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.width > maxX) maxX = b.x + b.width;
      if (b.y + b.height > maxY) maxY = b.y + b.height;
    });

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(maxX - minX, 10),
      height: Math.max(maxY - minY, 10),
    };
  }, [activePreviewElements]);

  const clampTransform = useCallback((t: { scale: number; x: number; y: number }) => {
    const container = containerRef.current;
    if (!container || !isFinite(diagramBounds.minX)) return t;

    const viewportWidth = container.clientWidth || 1000;
    const viewportHeight = container.clientHeight || 600;

    const margin = 100;
    const minPanX = margin - (diagramBounds.maxX + 28) * t.scale;
    const maxPanX = viewportWidth - margin - (diagramBounds.minX - 28) * t.scale;

    const minPanY = margin - (diagramBounds.maxY + 28) * t.scale;
    const maxPanY = viewportHeight - margin - (diagramBounds.minY - 28) * t.scale;

    let clampedX = t.x;
    let clampedY = t.y;

    if (minPanX <= maxPanX) {
      clampedX = Math.min(Math.max(t.x, minPanX), maxPanX);
    } else {
      clampedX = (viewportWidth - (diagramBounds.minX + diagramBounds.maxX) * t.scale) / 2;
    }

    if (minPanY <= maxPanY) {
      clampedY = Math.min(Math.max(t.y, minPanY), maxPanY);
    } else {
      clampedY = (viewportHeight - (diagramBounds.minY + diagramBounds.maxY) * t.scale) / 2;
    }

    if (clampedX === t.x && clampedY === t.y) return t;
    return { ...t, x: clampedX, y: clampedY };
  }, [containerRef, diagramBounds]);

  useEffect(() => {
    const clamped = clampTransform(transform);
    if (clamped.x !== transform.x || clamped.y !== transform.y) {
      setTransform(clamped);
    }
  }, [transform, clampTransform, setTransform]);

  useEffect(() => {
    if (activePreviewElements.length > 0) {
      const timer = setTimeout(() => {
        focusDiagram();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activePreviewElements, focusDiagram]);

  // Handle modal close key (Escape)
  useEffect(() => {
    if (!activePreviewDsl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        rejectPreviewChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePreviewDsl, rejectPreviewChanges]);

  if (!activePreviewDsl || activePreviewElements.length === 0) return null;

  const handleRefine = () => {
    rejectPreviewChanges();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="flex h-[88vh] w-[92vw] max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        {/* Header Toolbar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b bg-muted/30 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-none text-foreground">
                AI Diagram Edit Preview
              </h3>
              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                Review generated shapes before applying to whiteboard canvas
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onClick={acceptPreviewChanges}
            >
              <Check className="h-4 w-4" />
              Accept Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
              onClick={handleRefine}
              title="Close preview and refine prompt with AI"
            >
              <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
              Review / Refine
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={rejectPreviewChanges}
              title="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Bounded Diagram Preview Container */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="relative flex-1 cursor-grab overflow-hidden bg-muted/15 active:cursor-grabbing"
          onWheel={handlers.onWheel as unknown as React.WheelEventHandler<HTMLDivElement>}
          onPointerDown={handlers.onPointerDown as unknown as React.PointerEventHandler<HTMLDivElement>}
          onPointerMove={handlers.onPointerMove as unknown as React.PointerEventHandler<HTMLDivElement>}
          onPointerUp={handlers.onPointerUp as unknown as React.PointerEventHandler<HTMLDivElement>}
          onPointerLeave={handlers.onPointerUp as unknown as React.PointerEventHandler<HTMLDivElement>}
        >
          <svg className="h-full w-full select-none">
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              {/* Bounded Diagram Artboard Container Card */}
              <rect
                x={diagramBounds.minX - 32}
                y={diagramBounds.minY - 32}
                width={diagramBounds.width + 64}
                height={diagramBounds.height + 64}
                rx={16}
                fill="var(--background)"
                stroke="var(--border)"
                strokeWidth={1.5}
                className="shadow-sm"
              />
              <WhiteboardElements
                elements={activePreviewElements}
                selectedIds={[]}
                editingElementId={null}
                endpointDragState={null}
                onElementPointerDown={() => {}}
                onEndpointPointerDown={() => {}}
                onElementClick={() => {}}
                onElementDoubleClick={() => {}}
              />
            </g>
          </svg>

          {/* Zoom & Fit Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border bg-background/90 p-1 shadow-lg backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => zoomOut()}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>

            <span className="min-w-[40px] text-center font-mono text-[11px] font-semibold text-foreground">
              {Math.round(transform.scale * 100)}%
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => zoomIn()}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={reset}
              title="Reset View"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
