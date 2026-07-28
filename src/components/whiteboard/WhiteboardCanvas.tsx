'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWhiteboardStore, GRID_SIZE } from '@/lib/store/whiteboard-store';
import { WHITEBOARD_COLORS, isPolygonShapeType, WHITEBOARD_COLOR_KEYS } from '@/lib/whiteboard/whiteboard-types';
import { Trash2, Plus, Minus, Maximize, Grid3X3, Download, Copy, CopyPlus, Clipboard, Group, Ungroup, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePanZoom } from '@/lib/hooks/usePanZoom';
import { useWhiteboardInteractions } from '@/lib/hooks/useWhiteboardInteractions';
import { WhiteboardElements } from './WhiteboardElements';
import { WhiteboardOverlays } from './WhiteboardOverlays';
import { ExportMenu } from './ExportMenu';
import { ContextMenu } from './ContextMenu';
import { ToolSubOptions } from './ToolSubOptions';
import { InlineTextEditor } from './InlineTextEditor';
import { ArrowToolbar } from './ArrowToolbar';
import { IconToolbar } from './IconToolbar';
import { ShapeToolbar } from './ShapeToolbar';

export function WhiteboardCanvas() {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const showGrid = useWhiteboardStore((s) => s.showGrid);
  const setShowGrid = useWhiteboardStore((s) => s.setShowGrid);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const copyToClipboard = useWhiteboardStore((s) => s.copyToClipboard);
  const pasteFromClipboard = useWhiteboardStore((s) => s.pasteFromClipboard);
  const groupSelected = useWhiteboardStore((s) => s.groupSelected);
  const ungroupSelected = useWhiteboardStore((s) => s.ungroupSelected);

  const { transform, svgRef, handlers, setTransform, zoomIn, zoomOut, reset, fitToContent } = usePanZoom();

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
    isDraggingShape,
    drawingState,
    selectionBox,
    endpointDragState,
    setEndpointDragState,
    quickConnectDragState,
    setQuickConnectDragState,
    activeSnap,
    hoveredPort,
    setHoveredPort,
    selectedElements,
    hasSelection,
    singleSelectedShape,
    editingElementId,
    setEditingElementId,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleElementClick,
    handleElementDoubleClick,
    handleElementPointerDown,
    handleResizeHandlePointerDown,
    handleFitContent,
    handleFitSelection,
    spawnConnectedNode,
    deleteElements,

  } = useWhiteboardInteractions({
    transform,
    setTransform,
    svgRef,
    reset,
    fitToContent,
    panZoomHandlers: handlers,
  });

  const [showExport, setShowExport] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; context: 'canvas' | 'element' | 'multi' } | null>(null);

  // Elements sorted by z-order (later in array = on top)
  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);
  const setActiveStrokeHex = useWhiteboardStore((s) => s.setActiveStrokeHex);
  const activeFillHex = useWhiteboardStore((s) => s.activeFillHex);
  const setActiveFillHex = useWhiteboardStore((s) => s.setActiveFillHex);

  // Zoom level indicator animation
  const [zoomAnimState, setZoomAnimState] = useState<'idle' | 'pop-in' | 'pop-out'>('idle');
  const prevScaleRef = useRef(transform.scale);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevScaleRef.current;
    if (prev !== transform.scale) {
      prevScaleRef.current = transform.scale;

      // Clear any pending settle timer
      if (animTimerRef.current !== null) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }

      setZoomAnimState('pop-in');

      // After the pop-in settles, fade back to idle
      animTimerRef.current = setTimeout(() => {
        setZoomAnimState('pop-out');
        animTimerRef.current = setTimeout(() => {
          setZoomAnimState('idle');
          animTimerRef.current = null;
        }, 300);
      }, 800);
    }
  }, [transform.scale]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (animTimerRef.current !== null) clearTimeout(animTimerRef.current);
    };
  }, []);

  const isBottomToolbarSelection = selectedElements.length > 0 && selectedElements.every(el => el.type === 'arrow' || el.type === 'line' || isPolygonShapeType(el.type));

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-background">
      {/* Floating Rich Text Formatting Toolbar (hidden when selection is handled by ArrowToolbar / ShapeToolbar) */}
      {hasSelection && !isBottomToolbarSelection && (
        <div className="absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border bg-muted/90 p-1.5 shadow-2xl backdrop-blur animate-in fade-in zoom-in-95">
          <select
            value={activeFontFamily}
            onChange={(e) => {
              setActiveFontFamily(e.target.value);
              selectedIds.forEach((id) => updateElement(id, { fontFamily: e.target.value }));
            }}
            className="h-7 rounded-md border bg-muted/30 px-2 text-xs font-medium text-foreground outline-none"
          >
            <option value="Inter, sans-serif">Sans-Serif</option>
            <option value="Roboto, sans-serif">Roboto</option>
            <option value="'Courier New', monospace">Monospace</option>
            <option value="Georgia, serif">Serif</option>
          </select>

          <div className="flex items-center gap-1 border-x px-2">
            <span className="text-[10px] font-semibold text-muted-foreground">Size:</span>
            <input
              type="number" min={8} max={72} value={activeFontSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setActiveFontSize(val);
                selectedIds.forEach((id) => updateElement(id, { fontSize: val }));
              }}
              className="h-7 w-12 rounded-md border bg-muted/30 px-1.5 text-center text-xs font-semibold text-foreground outline-none"
            />
          </div>

          <div className="flex items-center gap-1 border-r pr-2">
            {WHITEBOARD_COLOR_KEYS.map((colorKey) => {
              const c = WHITEBOARD_COLORS[colorKey];
              return (
                <button
                  key={colorKey}
                  onClick={() => selectedIds.forEach((id) => updateElement(id, { strokeColor: c.border, fillColor: c.bg }))}
                  className={cn('h-4 w-4 rounded-full border transition-transform hover:scale-110', 
                    selectedIds.length === 1 && elements.find(e => e.id === selectedIds[0])?.strokeColor === c.border && 'ring-2 ring-primary ring-offset-1'
                  )}
                  style={{ backgroundColor: c.border }}
                />
              );
            })}
            {/* Custom hex color pickers for selected element colors */}
            <div className="flex items-center gap-0.5 border-l pl-1.5 ml-1.5">
              <input
                type="color"
                value={selectedIds.length === 1 ? (elements.find(e => e.id === selectedIds[0])?.strokeColor ?? activeStrokeHex) : activeStrokeHex}
                onChange={(e) => selectedIds.forEach((id) => updateElement(id, { strokeColor: e.target.value }))}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Custom stroke color"
              />
              <input
                type="color"
                value={selectedIds.length === 1 ? (elements.find(e => e.id === selectedIds[0])?.fillColor ?? activeFillHex) : activeFillHex}
                onChange={(e) => selectedIds.forEach((id) => updateElement(id, { fillColor: e.target.value }))}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Custom fill color"
              />
            </div>
          </div>

          {/* Line style selector */}
          <div className="flex items-center gap-0.5 border-r pr-2">
            {(['solid', 'dashed', 'dotted'] as const).map((ls) => (
              <button key={ls} title={ls}
                onClick={() => selectedIds.forEach((id) => updateElement(id, { lineStyle: ls }))}
                className="h-6 w-6 rounded border bg-muted/30 flex items-center justify-center hover:bg-accent">
                <div className="w-4 border-b-2" style={{ borderStyle: ls === 'solid' ? 'solid' : ls === 'dashed' ? 'dashed' : 'dotted' }} />
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => deleteElements(selectedIds)} title="Delete Selected">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sub-tool options bar — appears below the left toolbar when a drawing tool is active */}
      <div className="absolute top-4 left-[58px] z-40">
        <ToolSubOptions />
      </div>

      {/* Special bottom toolbars (eraser.io style) */}
      <ArrowToolbar />
      <IconToolbar />
      <ShapeToolbar />

      {/* SVG Canvas Workspace */}
      <svg
        ref={svgRef}
        className="h-full w-full touch-none"
        style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'crosshair' }}
        onWheel={handlers.onWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => {
          e.preventDefault();
          const context = selectedIds.length > 1 ? 'multi' : selectedIds.length === 1 ? 'element' : 'canvas';
          setContextMenu({ x: e.clientX, y: e.clientY, context });
        }}
      >
        <defs>
          {showGrid && (
            <pattern id="wb-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse"
              patternTransform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={1} fill="currentColor" className="text-foreground/10" />
            </pattern>
          )}
          {/* Fallback markers */}
          <marker id="wb-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 2 1.5 L 8.5 5 L 2 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-triangle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 1.5 1.5 L 8.5 5 L 1.5 8.5 z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-diamond" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 1 5 L 5 1.5 L 9 5 L 5 8.5 z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-circle" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <circle cx="5" cy="5" r="4" fill="currentColor" />
          </marker>
          <marker id="wb-arrowhead-none" viewBox="0 0 1 1" refX="0" refY="0" markerWidth="0" markerHeight="0" orient="auto">
            <path d="" />
          </marker>

          <marker id="wb-arrowhead-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 8 1.5 L 1.5 5 L 8 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-start-triangle" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 8.5 1.5 L 1.5 5 L 8.5 8.5 z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-start-diamond" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 9 5 L 5 1.5 L 1 5 L 5 8.5 z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-start-circle" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <circle cx="5" cy="5" r="4" fill="currentColor" />
          </marker>

          {/* Color-specific arrowhead markers */}
          {Array.from(
            new Set([
              '#3b82f6',
              '#10b981',
              '#f59e0b',
              '#8b5cf6',
              '#f43f5e',
              '#6b7280',
              '#000000',
              '#ffffff',
              ...elements.map((el) => el.strokeColor).filter(Boolean),
            ])
          ).map((color) => {
            const cId = color.replace(/[^a-zA-Z0-9]/g, '');
            return (
              <React.Fragment key={cId}>
                {/* Open Arrowhead (Unfilled V-Chevron) */}
                <marker id={`wb-arrowhead-${cId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 2 1.5 L 8.5 5 L 2 8.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
                {/* Solid Triangle */}
                <marker id={`wb-arrowhead-triangle-${cId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 1.5 1.5 L 8.5 5 L 1.5 8.5 z" fill={color} stroke={color} strokeLinejoin="round" />
                </marker>
                {/* Enlarged Diamond */}
                <marker id={`wb-arrowhead-diamond-${cId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                  <path d="M 1 5 L 5 1.5 L 9 5 L 5 8.5 z" fill={color} stroke={color} strokeLinejoin="round" />
                </marker>
                {/* Circle Dot */}
                <marker id={`wb-arrowhead-circle-${cId}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <circle cx="5" cy="5" r="4" fill={color} stroke={color} />
                </marker>

                {/* Start Markers */}
                <marker id={`wb-arrowhead-start-${cId}`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 8 1.5 L 1.5 5 L 8 8.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
                <marker id={`wb-arrowhead-start-triangle-${cId}`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 8.5 1.5 L 1.5 5 L 8.5 8.5 z" fill={color} stroke={color} strokeLinejoin="round" />
                </marker>
                <marker id={`wb-arrowhead-start-diamond-${cId}`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                  <path d="M 9 5 L 5 1.5 L 1 5 L 5 8.5 z" fill={color} stroke={color} strokeLinejoin="round" />
                </marker>
                <marker id={`wb-arrowhead-start-circle-${cId}`} viewBox="0 0 10 10" refX="3" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <circle cx="5" cy="5" r="4" fill={color} stroke={color} />
                </marker>
              </React.Fragment>
            );
          })}
        </defs>

        {showGrid && <rect width="100%" height="100%" fill="url(#wb-grid)" />}

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          <WhiteboardElements
            elements={elements}
            selectedIds={selectedIds}
            endpointDragState={endpointDragState}
            editingElementId={editingElementId}
            onElementPointerDown={handleElementPointerDown}
            onElementClick={handleElementClick}
            onElementDoubleClick={handleElementDoubleClick}
            onEndpointPointerDown={(evt, arrowId, endpoint, pos) => {
              evt.stopPropagation();
              setEndpointDragState({ arrowId, endpoint, currentPos: pos });
            }}
            onElementContextMenu={(e, el) => {
              e.preventDefault();
              e.stopPropagation();
              const context = selectedIds.length > 1 || (selectedIds.length === 1 && selectedIds[0] === el.id) ?
                (selectedIds.length > 1 ? 'multi' : 'element') : 'element';
              setContextMenu({ x: e.clientX, y: e.clientY, context });
            }}

          />

          {/* Render InlineTextEditor for the element being edited */}
          {editingElementId && (() => {
            const editingEl = elements.find(el => el.id === editingElementId);
            if (!editingEl) return null;
            return (
              <g key={`inline-editor-${editingElementId}`}>
                <InlineTextEditor element={editingEl} onFinish={() => setEditingElementId(null)} />
              </g>
            );
          })()}

          <WhiteboardOverlays
            elements={elements}
            activeTool={activeTool}
            drawingState={drawingState}
            endpointDragState={endpointDragState}
            quickConnectDragState={quickConnectDragState}
            activeSnap={activeSnap}
            selectionBox={selectionBox}
            selectedElements={selectedElements}
            singleSelectedShape={singleSelectedShape}
            hoveredPort={hoveredPort}
            isDraggingShape={isDraggingShape}
            onResizeHandlePointerDown={handleResizeHandlePointerDown}
            onSpawnConnectedNode={spawnConnectedNode}
            onQuickConnectDragStart={(evt, sourceId, fromPort, pos) => {
              setQuickConnectDragState({ sourceId, fromPort, startPos: pos, currentPos: pos });
            }}
            onPortHover={setHoveredPort}
          />

          {/* Infinite canvas origin crosshair — gives spatial orientation */}
          <g className="pointer-events-none">
            {/* Axes lines extending far in all directions */}
            <line x1={-1000000} y1={0} x2={1000000} y2={0} stroke="currentColor" strokeWidth={0.5} className="text-foreground/[0.04]" />
            <line x1={0} y1={-1000000} x2={0} y2={1000000} stroke="currentColor" strokeWidth={0.5} className="text-foreground/[0.04]" />
            {/* Origin dot */}
            <circle cx={0} cy={0} r={2.5} fill="currentColor" className="text-foreground/15" />
            {/* Origin label */}
            <text x={5} y={-5} fontSize={9} fill="currentColor" className="text-foreground/25 select-none" fontFamily="monospace" fontStyle="italic">
              (0, 0)
            </text>
          </g>
        </g>
      </svg>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          context={contextMenu.context}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Floating Actions Toolbar */}
      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {/* Export Menu */}
        {showExport && <ExportMenu svgRef={svgRef} onClose={() => setShowExport(false)} />}

        {/* Zoom & Utility Controls */}
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/90 p-1 shadow-lg backdrop-blur">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomIn} title="Zoom In (+)">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={zoomOut} title="Zoom Out (-)">
            <Minus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFitContent} title="Fit All">
            <Maximize className="h-4 w-4" />
          </Button>
          {selectedIds.length > 0 && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFitSelection} title="Fit Selection">
              <ZoomIn className="h-4 w-4" />
            </Button>
          )}
          <div className="h-px w-full bg-border" />
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setShowGrid(!showGrid)} title="Toggle Grid">
            <Grid3X3 className={`h-4 w-4 ${showGrid ? 'text-primary' : 'text-muted-foreground'}`} />
          </Button>
          {selectedIds.length > 0 && (
            <>
              <div className="h-px w-full bg-border" />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={duplicateSelected} title="Duplicate (Ctrl+D)">
                <CopyPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyToClipboard} title="Copy (Ctrl+C)">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={pasteFromClipboard} title="Paste (Ctrl+V)">
                <Clipboard className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {selectedIds.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={groupSelected} title="Group (Ctrl+G)">
                <Group className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={ungroupSelected} title="Ungroup (Ctrl+Shift+G)">
                <Ungroup className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="h-px w-full bg-border" />
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setShowExport(!showExport)} title="Export (PNG/SVG/PDF)">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Zoom Level Badge with Animation */}
      <div
        className={`absolute bottom-4 left-4 z-40 rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-md backdrop-blur transition-all duration-300 ${
          zoomAnimState === 'pop-in'
            ? 'scale-125 border-primary/60 bg-primary/10 text-primary shadow-primary/20'
            : zoomAnimState === 'pop-out'
              ? 'scale-100 border-border/80 bg-muted/90 text-muted-foreground'
              : 'border-border bg-muted/90 text-muted-foreground'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className={`inline-block transition-transform duration-200 ${
            zoomAnimState === 'pop-in' ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </span>
          {Math.round(transform.scale * 100)}%
        </span>
      </div>

    </div>
  );
}
