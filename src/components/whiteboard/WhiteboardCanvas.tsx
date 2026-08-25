'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useWhiteboardStore, GRID_SIZE } from '@/lib/store/whiteboard-store';
import { STROKE_COLOR_PALETTE, computeTextElementSize } from '@/lib/whiteboard/whiteboard-types';
import { Maximize, Grid3X3, Download, Copy, CopyPlus, Clipboard, Group, Ungroup, Focus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateId, cn } from '@/lib/utils';
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
import { CollaboratorCursors } from '@/components/collaboration/CollaboratorCursors';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';
import { useCollaborationStore } from '@/lib/collaboration/collaboration-store';

const SELECT_CURSOR_LIGHT = `url("data:image/svg+xml,%3Csvg width='24px' height='24px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 21L4 4L21 11L14.7353 13.6849C14.2633 13.8872 13.8872 14.2633 13.6849 14.7353L11 21Z' stroke='%23292929' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E") 4 4, url('/cursor/select-cursor.svg') 4 4, default`;

const SELECT_CURSOR_DARK = `url("data:image/svg+xml,%3Csvg width='24px' height='24px' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 21L4 4L21 11L14.7353 13.6849C14.2633 13.8872 13.8872 14.2633 13.6849 14.7353L11 21Z' stroke='%23e4e4e7' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E") 4 4, url('/cursor/select-cursor.svg') 4 4, default`;

export function WhiteboardCanvas() {
  const { resolvedTheme } = useTheme();
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
    isHandActive,
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

  const { publishCursor } = useRealtimeCollaboration();

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    handlePointerMove(e);
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasX = (screenX - transform.x) / transform.scale;
      const canvasY = (screenY - transform.y) / transform.scale;
      publishCursor({ x: canvasX, y: canvasY });
    }
  };

  const handleCanvasPointerLeave = () => {
    publishCursor(null);
  };

  const [showExport, setShowExport] = useState(false);
  const hideUI = useWhiteboardStore((s) => s.hideUI);
  const setHideUI = useWhiteboardStore((s) => s.setHideUI);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; context: 'canvas' | 'element' | 'multi' } | null>(null);

  const followingUserId = useCollaborationStore((s) => s.followingUserId);
  const setFollowingUserId = useCollaborationStore((s) => s.setFollowingUserId);
  const collaboratorsMap = useCollaborationStore((s) => s.collaborators);
  const followedCollaborator = followingUserId ? collaboratorsMap.get(followingUserId) : null;

  // Auto-recenter camera viewport to follow presenter in real time
  useEffect(() => {
    if (followedCollaborator?.cursor && svgRef.current) {
      const { x, y } = followedCollaborator.cursor;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const targetX = centerX - x * transform.scale;
      const targetY = centerY - y * transform.scale;
      setTransform({ x: targetX, y: targetY, scale: transform.scale });
    }
  }, [followedCollaborator, transform.scale, setTransform, svgRef]);

  const focusTargetNodes = useWhiteboardStore((s) => s.focusTargetNodes);
  const setFocusTargetNodes = useWhiteboardStore((s) => s.setFocusTargetNodes);

  useEffect(() => {
    if (focusTargetNodes && focusTargetNodes.length > 0) {
      fitToContent(focusTargetNodes);
      setFocusTargetNodes(null);
    }
  }, [focusTargetNodes, fitToContent, setFocusTargetNodes]);

  const handleCanvasDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isHandActive) return;
    const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
    if (targetTag === 'svg' || targetTag === 'rect' || targetTag === 'path' || targetTag === 'pattern' || targetTag === 'circle') {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const canvasX = (screenX - transform.x) / transform.scale;
        const canvasY = (screenY - transform.y) / transform.scale;

        const initialSize = computeTextElementSize('', 24, 'text');
        const newTextElement = {
          id: generateId(),
          type: 'text' as const,
          x: canvasX,
          y: canvasY,
          width: initialSize.width,
          height: initialSize.height,
          text: '',
          fontSize: 24,
          strokeColor: STROKE_COLOR_PALETTE[0],
          strokeWidth: 1,
          mode: 'text' as const,
          language: 'Auto detect',
        };
        addElement(newTextElement);
        setSelectedIds([newTextElement.id]);
        setEditingElementId(newTextElement.id);
      }
    }
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-background">

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

      <svg
        ref={svgRef}
        suppressHydrationWarning
        className={cn(
          "h-full w-full touch-none",
          isHandActive && "[&_*]:!cursor-grab active:[&_*]:!cursor-grabbing"
        )}
        style={{
          cursor: isPanning
            ? 'grabbing'
            : isHandActive
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
        onPointerMove={handleCanvasPointerMove}
        onPointerLeave={handleCanvasPointerLeave}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleCanvasDoubleClick}
        onContextMenu={(e) => {
          if (isHandActive) return;
          e.preventDefault();
          const context = selectedIds.length > 1 ? 'multi' : selectedIds.length === 1 ? 'element' : 'canvas';
          setContextMenu({ x: e.clientX, y: e.clientY, context });
        }}
      >
        <defs>
          {showGrid && (
            <pattern id="wb-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse"
              patternTransform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              <circle cx="1" cy="1" r="1" className="fill-foreground/15" />
            </pattern>
          )}

          {/* Default Fallback Markers using context-stroke for universal stroke color matching */}
          <marker id="wb-arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 1.5 1.5 L 8.5 5 L 1.5 8.5" fill="none" stroke="context-stroke" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-triangle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 z" fill="context-stroke" />
          </marker>
          <marker id="wb-arrowhead-diamond" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 5 0 L 10 5 L 5 10 L 0 5 z" fill="context-stroke" stroke="context-stroke" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-circle" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <circle cx="5" cy="5" r="4" fill="context-stroke" stroke="context-stroke" />
          </marker>
          <marker id="wb-arrowhead-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 8.5 1.5 L 1.5 5 L 8.5 8.5" fill="none" stroke="context-stroke" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-start-triangle" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 10 1 L 1 5 L 10 9 z" fill="context-stroke" />
          </marker>
          <marker id="wb-arrowhead-start-diamond" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M 9 5 L 5 1.5 L 1 5 L 5 8.5 z" fill="context-stroke" stroke="context-stroke" strokeLinejoin="round" />
          </marker>
          <marker id="wb-arrowhead-start-circle" viewBox="0 0 10 10" refX="3" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <circle cx="5" cy="5" r="4" fill="context-stroke" stroke="context-stroke" />
          </marker>

          {/* Color-specific Markers for all Palette & Active Element Colors */}
          {Array.from(
            new Set([
              ...STROKE_COLOR_PALETTE.map((col) => (typeof col === 'string' ? col : (col as { value: string }).value)),
              ...elements.map((el) => el.strokeColor).filter(Boolean),
              '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#a855f7', '#6b7280', '#f43f5e', '#22c55e', '#374151', '#ffffff', '#000000',
            ])
          ).map((col) => {
            const color = typeof col === 'string' ? col : (col as { value: string }).value;
            const cId = color.replace(/[^a-zA-Z0-9]/g, '');
            if (!cId) return null;
            return (
              <React.Fragment key={cId}>
                <marker id={`wb-arrowhead-${cId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 1.5 1.5 L 8.5 5 L 1.5 8.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
                <marker id={`wb-arrowhead-triangle-${cId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9 z" fill={color} />
                </marker>
                <marker id={`wb-arrowhead-diamond-${cId}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                  <path d="M 5 0 L 10 5 L 5 10 L 0 5 z" fill={color} stroke={color} strokeLinejoin="round" />
                </marker>
                <marker id={`wb-arrowhead-circle-${cId}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <circle cx="5" cy="5" r="4" fill={color} stroke={color} />
                </marker>
                <marker id={`wb-arrowhead-start-${cId}`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 8.5 1.5 L 1.5 5 L 8.5 8.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
                <marker id={`wb-arrowhead-start-triangle-${cId}`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 10 1 L 1 5 L 10 9 z" fill={color} />
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
              if (isHandActive || evt.button === 1) {
                handlePointerDown(evt);
                return;
              }
              evt.stopPropagation();
              setEndpointDragState({ arrowId, endpoint, currentPos: pos });
            }}
            onElementContextMenu={(e, el) => {
              if (isHandActive || e.button === 1) return;
              e.preventDefault();
              e.stopPropagation();
              const context = selectedIds.length > 1 || (selectedIds.length === 1 && selectedIds[0] === el.id) ?
                (selectedIds.length > 1 ? 'multi' : 'element') : 'element';
              setContextMenu({ x: e.clientX, y: e.clientY, context });
            }}
          />

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
            isHandActive={isHandActive}
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
              if (isHandActive || evt.button === 1) {
                handlePointerDown(evt);
                return;
              }
              setQuickConnectDragState({ sourceId, fromPort, startPos: pos, currentPos: pos });
            }}
            onPortHover={setHoveredPort}
          />

          {/* Real-time Multiplayer Cursors & Peer Selections Overlay */}
          <CollaboratorCursors elements={elements} />
        </g>
      </svg>

      {/* Active Presenter Follow Mode Banner */}
      {followedCollaborator && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-amber-500/40 bg-background/95 px-4 py-1.5 shadow-xl backdrop-blur-md animate-in slide-in-from-top-4 duration-200 select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-xs font-semibold text-foreground">
            Following <span className="font-bold text-amber-500">{followedCollaborator.name}</span>
          </span>
          <button
            onClick={() => setFollowingUserId(null)}
            className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs"
            title="Stop following presentation"
          >
            ✕
          </button>
        </div>
      )}

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
