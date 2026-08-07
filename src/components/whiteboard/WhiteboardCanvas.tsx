'use client';

import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useWhiteboardStore, GRID_SIZE } from '@/lib/store/whiteboard-store';
import { STROKE_COLOR_PALETTE, computeTextElementSize } from '@/lib/whiteboard/whiteboard-types';
import { Maximize, Grid3X3, Download, Copy, CopyPlus, Clipboard, Group, Ungroup, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateId } from '@/lib/utils';
import { usePanZoom } from '@/lib/hooks/usePanZoom';
import { useWhiteboardInteractions } from '@/lib/hooks/useWhiteboardInteractions';
import { WhiteboardElements } from './WhiteboardElements';
import { WhiteboardOverlays } from './WhiteboardOverlays';
import { ExportMenu } from './ExportMenu';
import { ContextMenu } from './ContextMenu';
import { InlineTextEditor } from './InlineTextEditor';
import { ArrowToolbar } from './toolbars/ArrowToolbar';
import { IconToolbar } from './toolbars/IconToolbar';
import { ShapeToolbar } from './toolbars/ShapeToolbar';
import { PencilToolbar } from './toolbars/PencilToolbar';
import { TextFormattingToolbar } from './toolbars/TextFormattingToolbar';
import { FigureToolbar } from './toolbars/FigureToolbar';
import { ZoomPanMenu } from './ZoomPanMenu';
import { useTheme } from 'next-themes';
import type { TextElement } from '@/lib/whiteboard/whiteboard-types';

const SELECT_CURSOR_LIGHT = `url("data:image/svg+xml,%3Csvg width='24px' height='24px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 21L4 4L21 11L14.7353 13.6849C14.2633 13.8872 13.8872 14.2633 13.6849 14.7353L11 21Z' stroke='%23292929' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E") 4 4, url('/cursor/select-cursor.svg') 4 4, default`;

const SELECT_CURSOR_DARK = `url("data:image/svg+xml,%3Csvg width='24px' height='24px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 21L4 4L21 11L14.7353 13.6849C14.2633 13.8872 13.8872 14.2633 13.6849 14.7353L11 21Z' stroke='%23e4e4e7' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E") 4 4, url('/cursor/select-cursor.svg') 4 4, default`;

export function WhiteboardCanvas() {
  const { resolvedTheme } = useTheme();
  // true on the client, false on the server — avoids hydration mismatches
  // without needing a state-update effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const selectCursor = mounted && resolvedTheme === 'dark' ? SELECT_CURSOR_DARK : SELECT_CURSOR_LIGHT;

  const addElement = useWhiteboardStore((s) => s.addElement);
  const setSelectedIds = useWhiteboardStore((s) => s.setSelectedIds);
  const showGrid = useWhiteboardStore((s) => s.showGrid);
  const setShowGrid = useWhiteboardStore((s) => s.setShowGrid);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const copyToClipboard = useWhiteboardStore((s) => s.copyToClipboard);
  const pasteFromClipboard = useWhiteboardStore((s) => s.pasteFromClipboard);
  const groupSelected = useWhiteboardStore((s) => s.groupSelected);
  const ungroupSelected = useWhiteboardStore((s) => s.ungroupSelected);

  const { transform, svgRef, handlers, setTransform, zoomIn, zoomOut, reset, fitToContent } = usePanZoom({ enableKeyboardShortcuts: true });

  const {
    elements,
    selectedIds,
    activeTool,
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

  } = useWhiteboardInteractions({
    transform,
    setTransform,
    svgRef,
    reset,
    zoomIn,
    zoomOut,
    fitToContent,
    panZoomHandlers: handlers,
  });

  const [showExport, setShowExport] = useState(false);
  const hideUI = useWhiteboardStore((s) => s.hideUI);
  const setHideUI = useWhiteboardStore((s) => s.setHideUI);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; context: 'canvas' | 'element' | 'multi' } | null>(null);

  // Elements sorted by z-order (later in array = on top)
  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);

  // Zoom level indicator animation
  const [, setZoomAnimState] = useState<'idle' | 'pop-in' | 'pop-out'>('idle');
  const prevScaleRef = useRef(transform.scale);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusTargetNodes = useWhiteboardStore((s) => s.focusTargetNodes);
  const setFocusTargetNodes = useWhiteboardStore((s) => s.setFocusTargetNodes);

  useEffect(() => {
    if (focusTargetNodes && focusTargetNodes.length > 0) {
      fitToContent(focusTargetNodes);
      setFocusTargetNodes(null);
    }
  }, [focusTargetNodes, fitToContent, setFocusTargetNodes]);

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

  const handleCanvasDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    if (targetTag === 'svg' || targetTag === 'rect' || targetTag === 'path' || targetTag === 'pattern' || targetTag === 'circle') {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasX = (screenX - transform.x) / transform.scale;
        const canvasY = (screenY - transform.y) / transform.scale;

        const initialSize = computeTextElementSize('', 24, 'text');
        const newText: TextElement = {
          id: generateId(),
          type: 'text',
          x: Math.round(canvasX),
          y: Math.round(canvasY),
          width: initialSize.width,
          height: initialSize.height,
          text: '',
          fontSize: 24,
          strokeColor: activeStrokeHex || 'var(--foreground)',
          strokeWidth: 1,
          mode: 'text',
          language: 'Auto detect',
        };

        addElement(newText);
        setSelectedIds([newText.id]);
        setEditingElementId(newText.id);
      }
    }
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-background">

      {/* Sub-tool options bar & bottom toolbars (eraser.io style) */}
      {!hideUI && (
        <>

          <ArrowToolbar />
          <IconToolbar />
          <ShapeToolbar />
          <PencilToolbar />
          <TextFormattingToolbar />
          <FigureToolbar fitToContent={fitToContent} />
        </>
      )}

      {/* SVG Canvas Workspace */}
      <svg
        ref={svgRef}
        suppressHydrationWarning
        className="h-full w-full touch-none"
        style={{
          cursor: isPanning
            ? 'grabbing'
            : (isSpacePressed || activeTool === 'hand')
              ? 'grab'
              : (endpointDragState || quickConnectDragState || isDraggingShape)
                ? 'grabbing'
                : activeTool === 'select'
                  ? selectCursor
                  : activeTool === 'text'
                    ? 'text'
                    : 'crosshair',
        }}
        onWheel={handlers.onWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleCanvasDoubleClick}
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
              ...STROKE_COLOR_PALETTE,
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
      {!hideUI && (
        <div className="absolute bottom-4 right-4 z-40 flex flex-col items-end gap-2">
          {/* Export Menu */}
          {showExport && <ExportMenu svgRef={svgRef} onClose={() => setShowExport(false)} />}

          {/* Utility Controls */}
          <div className="flex flex-col gap-1 rounded-lg border bg-muted/90 p-1 shadow-lg backdrop-blur">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setShowGrid(!showGrid)} title="Toggle Grid">
              <Grid3X3 className={`h-4 w-4 ${showGrid ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={handleFitContent} title="Zoom to Fit (Shift+1)">
              <Maximize className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={handleFitSelection} title="Zoom to Selection (Shift+2)">
              <Focus className="h-4 w-4" />
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
      )}

      {/* Top-Right Eraser.io Zoom & View Options Dropdown Component */}
      <ZoomPanMenu
        scale={transform.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomFitContent={handleFitContent}
        onZoomFitSelection={handleFitSelection}
        onZoomReset={reset}
        activeTool={activeTool}
        onToggleHandTool={() => useWhiteboardStore.getState().setActiveTool(activeTool === 'hand' ? 'select' : 'hand')}
        hideUI={hideUI}
        onToggleHideUI={() => setHideUI(!hideUI)}
      />

    </div>
  );
}
