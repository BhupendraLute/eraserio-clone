'use client';

import React, { useState } from 'react';
import { useAiChatStore } from '@/lib/store/ai-chat-store';
import { Button } from '@/components/ui/button';
import { WhiteboardElements } from '@/components/whiteboard/WhiteboardElements';
import { getElementBounds } from '@/lib/whiteboard/whiteboard-types';
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

  const [scale, setScale] = useState(1.0);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  React.useEffect(() => {
    if (activePreviewElements.length > 0) {
      let minX = Infinity;
      let minY = Infinity;
      activePreviewElements.forEach((el) => {
        const b = getElementBounds(el);
        if (b.x < minX) minX = b.x;
        if (b.y < minY) minY = b.y;
      });

      if (isFinite(minX) && isFinite(minY)) {
        setPan({ x: -minX + 80, y: -minY + 80 });
        setScale(1.0);
      }
    }
  }, [activePreviewElements]);

  if (!activePreviewDsl || activePreviewElements.length === 0) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

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

        {/* Interactive Popup Preview Canvas */}
        <div
          className="relative flex-1 cursor-grab overflow-hidden bg-dot-grid active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <svg className="h-full w-full select-none">
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
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
              onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>

            <span className="min-w-[40px] text-center font-mono text-[11px] font-semibold text-foreground">
              {Math.round(scale * 100)}%
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>

            <div className="mx-1 h-4 w-px bg-border" />

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setScale(1.0);
                setPan({ x: 40, y: 40 });
              }}
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
