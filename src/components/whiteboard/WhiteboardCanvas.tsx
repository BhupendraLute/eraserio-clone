'use client';

import React from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { Trash2, Plus, Minus, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePanZoom } from '@/lib/hooks/usePanZoom';
import { useWhiteboardInteractions } from '@/lib/hooks/useWhiteboardInteractions';
import { WhiteboardElements } from './WhiteboardElements';
import { WhiteboardOverlays } from './WhiteboardOverlays';

export function WhiteboardCanvas() {
  const updateElement = useWhiteboardStore((s) => s.updateElement);

  // Pan & Zoom Engine
  const { transform, svgRef, handlers, zoomIn, zoomOut, reset, fitToContent } = usePanZoom();

  // Unified Interactions Hook
  const {
    elements,
    selectedIds,
    activeTool,
    activeFontFamily,
    setActiveFontFamily,
    activeFontSize,
    setActiveFontSize,
    isSpacePressed,
    isPanning,
    drawingState,
    selectionBox,
    quickConnectDragState,
    setQuickConnectDragState,
    activeSnap,
    hoveredPort,
    setHoveredPort,
    selectedElements,
    hasSelection,
    singleSelectedShape,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleElementClick,
    handleElementPointerDown,
    handleResizeHandlePointerDown,
    handleFitContent,
    spawnConnectedNode,
    deleteElements,
    setEndpointDragState,
  } = useWhiteboardInteractions({
    transform,
    svgRef,
    reset,
    fitToContent,
    panZoomHandlers: handlers,
  });

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-background">
      {/* Floating Rich Text Formatting Toolbar */}
      {hasSelection && (
        <div className="absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border bg-background/95 p-1.5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95">
          <select
            value={activeFontFamily}
            onChange={(e) => {
              setActiveFontFamily(e.target.value);
              selectedIds.forEach((id) => updateElement(id, { fontFamily: e.target.value }));
            }}
            className="h-7 rounded-md border bg-muted/30 px-2 text-xs font-medium text-foreground outline-none"
          >
            <option value="Inter, sans-serif">Sans-Serif (Inter)</option>
            <option value="Roboto, sans-serif">Roboto</option>
            <option value="'Courier New', monospace">Monospace (Code)</option>
            <option value="Georgia, serif">Serif (Georgia)</option>
          </select>

          <div className="flex items-center gap-1 border-x px-2">
            <span className="text-[10px] font-semibold text-muted-foreground">Size:</span>
            <input
              type="number"
              min={8}
              max={72}
              value={activeFontSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setActiveFontSize(val);
                selectedIds.forEach((id) => updateElement(id, { fontSize: val }));
              }}
              className="h-7 w-12 rounded-md border bg-muted/30 px-1.5 text-center text-xs font-semibold text-foreground outline-none"
            />
          </div>

          {/* Color Palette Selector */}
          <div className="flex items-center gap-1 border-r pr-2">
            {(['blue', 'green', 'amber', 'purple', 'rose', 'gray'] as const).map((colorKey) => {
              const c = WHITEBOARD_COLORS[colorKey];
              return (
                <button
                  key={colorKey}
                  onClick={() => {
                    selectedIds.forEach((id) => {
                      updateElement(id, { strokeColor: c.border, fillColor: c.bg });
                    });
                  }}
                  className="h-4 w-4 rounded-full border transition-transform hover:scale-110"
                  style={{ backgroundColor: c.border }}
                />
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => deleteElements(selectedIds)}
            title="Delete Selected"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* SVG Canvas Workspace */}
      <svg
        ref={svgRef}
        className="h-full w-full touch-none"
        style={{
          cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'crosshair',
        }}
        onWheel={handlers.onWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <pattern
            id="wb-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
          >
            <circle cx="12" cy="12" r="1" fill="currentColor" className="text-foreground/10" />
          </pattern>
          <marker
            id="wb-arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#3b82f6" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#wb-grid)" />

        {/* World Space Group transformed by Zoom & Pan */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Main Whiteboard Shapes, Arrows & Text Elements */}
          <WhiteboardElements
            elements={elements}
            selectedIds={selectedIds}
            onElementPointerDown={handleElementPointerDown}
            onElementClick={handleElementClick}
            onEndpointPointerDown={(evt, arrowId, endpoint, pos) => {
              evt.stopPropagation();
              setEndpointDragState({ arrowId, endpoint, currentPos: pos });
            }}
          />

          {/* Interactive Previews, Snap Indicators, Resize Handles & Quick Connect Buttons */}
          <WhiteboardOverlays
            activeTool={activeTool}
            drawingState={drawingState}
            quickConnectDragState={quickConnectDragState}
            activeSnap={activeSnap}
            selectionBox={selectionBox}
            selectedElements={selectedElements}
            singleSelectedShape={singleSelectedShape}
            hoveredPort={hoveredPort}
            onResizeHandlePointerDown={handleResizeHandlePointerDown}
            onSpawnConnectedNode={spawnConnectedNode}
            onQuickConnectDragStart={(evt, sourceId, fromPort, pos) => {
              setQuickConnectDragState({
                sourceId,
                fromPort,
                startPos: pos,
                currentPos: pos,
              });
            }}
            onPortHover={setHoveredPort}
          />
        </g>
      </svg>

      {/* Floating Zoom & Pan Controls Toolbar */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-1 rounded-lg border bg-background/95 p-1 shadow-lg backdrop-blur">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn} title="Zoom In (+)">
          <Plus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut} title="Zoom Out (-)">
          <Minus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFitContent} title="Fit to Content / Reset View">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom Level Badge Indicator */}
      <div className="absolute bottom-4 left-4 z-40 rounded-lg border bg-background/95 px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-md backdrop-blur">
        {Math.round(transform.scale * 100)}%
      </div>
    </div>
  );
}
