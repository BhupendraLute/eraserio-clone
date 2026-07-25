'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import type {
  WhiteboardElement,
  ResizeHandle,
  Point,
} from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import {
  findNearestShapePort,
  getOptimalPortPair,
  generateUniqueId,
  getOppositePort,
  getElementBounds,
  ShapePortSnap,
} from '@/lib/whiteboard/orthogonal-routing';
import type { PanZoomState } from '@/lib/hooks/usePanZoom';
import type { LaidOutNode } from '@/lib/layout/types';

interface UseWhiteboardInteractionsProps {
  transform: PanZoomState;
  svgRef: React.RefObject<SVGSVGElement | null>;
  reset: () => void;
  fitToContent: (nodes: LaidOutNode[]) => void;
  panZoomHandlers: {
    onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
    onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  };
}

export function useWhiteboardInteractions({
  transform,
  svgRef,
  reset,
  fitToContent,
  panZoomHandlers,
}: UseWhiteboardInteractionsProps) {
  const elements = useWhiteboardStore((s) => s.elements);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeColor = useWhiteboardStore((s) => s.activeColor);
  const activeStrokeWidth = useWhiteboardStore((s) => s.activeStrokeWidth);

  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const addElement = useWhiteboardStore((s) => s.addElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const setSelectedIds = useWhiteboardStore((s) => s.setSelectedIds);
  const clearSelection = useWhiteboardStore((s) => s.clearSelection);
  const moveSelectedElements = useWhiteboardStore((s) => s.moveSelectedElements);
  const resizeElement = useWhiteboardStore((s) => s.resizeElement);
  const spawnConnectedNode = useWhiteboardStore((s) => s.spawnConnectedNode);
  const reconnectArrowEndpoint = useWhiteboardStore((s) => s.reconnectArrowEndpoint);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null);

  // Interaction State
  const [drawingState, setDrawingState] = useState<{
    start: Point;
    current: Point;
    points: Point[];
  } | null>(null);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    lastPos: Point;
  }>({ isDragging: false, lastPos: { x: 0, y: 0 } });

  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    handle: ResizeHandle;
    targetId: string;
    lastPos: Point;
  } | null>(null);

  const [selectionBox, setSelectionBox] = useState<{
    start: Point;
    current: Point;
  } | null>(null);

  // Draggable Arrow Endpoint State
  const [endpointDragState, setEndpointDragState] = useState<{
    arrowId: string;
    endpoint: 'start' | 'end';
    currentPos: Point;
  } | null>(null);

  // Quick-Connect Dragging State
  const [quickConnectDragState, setQuickConnectDragState] = useState<{
    sourceId: string;
    fromPort: 'top' | 'bottom' | 'left' | 'right';
    startPos: Point;
    currentPos: Point;
  } | null>(null);

  const [activeSnap, setActiveSnap] = useState<ShapePortSnap | null>(null);
  const [hoveredPort, setHoveredPort] = useState<{
    elementId: string;
    dir: 'top' | 'right' | 'bottom' | 'left';
  } | null>(null);

  const [activeFontFamily, setActiveFontFamily] = useState('Inter, sans-serif');
  const [activeFontSize, setActiveFontSize] = useState(14);

  // Spacebar pan mode listener
  useEffect(() => {
    const handleKeyDownWindow = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(targetTag)) return;
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUpWindow = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDownWindow);
    window.addEventListener('keyup', handleKeyUpWindow);
    return () => {
      window.removeEventListener('keydown', handleKeyDownWindow);
      window.removeEventListener('keyup', handleKeyUpWindow);
    };
  }, [isSpacePressed]);

  // Convert client cursor coords to world canvas coordinates (accounting for zoom scale and pan translation)
  const getCanvasCoords = useCallback(
    (e: React.PointerEvent | React.MouseEvent): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      return {
        x: (rawX - transform.x) / transform.scale,
        y: (rawY - transform.y) / transform.scale,
      };
    },
    [svgRef, transform]
  );

  // Keyboard shortcut listener for node flow spawning
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (selectedIds.length !== 1) return;
      const target = e.target as HTMLElement;
      if (['input', 'textarea', 'select'].includes(target.tagName.toLowerCase())) return;

      const selectedId = selectedIds[0];
      const selectedEl = elements.find((el) => el.id === selectedId);
      if (!selectedEl || selectedEl.type === 'arrow' || selectedEl.type === 'line' || selectedEl.type === 'pencil') {
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        spawnConnectedNode(selectedId, 'right');
      } else if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault();
        spawnConnectedNode(selectedId, 'right');
      } else if (e.ctrlKey && e.key === 'ArrowDown') {
        e.preventDefault();
        spawnConnectedNode(selectedId, 'bottom');
      } else if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        spawnConnectedNode(selectedId, 'left');
      } else if (e.ctrlKey && e.key === 'ArrowUp') {
        e.preventDefault();
        spawnConnectedNode(selectedId, 'top');
      }
    },
    [selectedIds, elements, spawnConnectedNode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Pan Mode via Spacebar or Middle Mouse Button
    if (e.button === 1 || isSpacePressed) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        startX: transform.x,
        startY: transform.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    const targetTag = (e.target as HTMLElement).tagName?.toLowerCase();
    if (
      e.target !== svgRef.current &&
      targetTag !== 'svg' &&
      targetTag !== 'rect'
    ) {
      return;
    }

    const coords = getCanvasCoords(e);

    if (activeTool === 'select') {
      setSelectionBox({ start: coords, current: coords });
      clearSelection();
      return;
    }

    if (
      [
        'rectangle',
        'circle',
        'diamond',
        'cylinder',
        'arrow',
        'line',
        'sticky',
        'pencil',
        'text',
        'frame',
        'cloud',
      ].includes(activeTool)
    ) {
      setDrawingState({
        start: coords,
        current: coords,
        points: [coords],
      });
    }
  };

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const hasSelection = selectedElements.length > 0;
  const singleSelectedShape =
    selectedElements.length === 1 &&
    !['arrow', 'line', 'pencil'].includes(selectedElements[0].type)
      ? selectedElements[0]
      : null;

  const handlePointerMove = (e: React.PointerEvent) => {
    // Handle Canvas Panning
    if (isPanningRef.current && panStartRef.current) {
      panZoomHandlers.onPointerMove(e as any);
      return;
    }

    const coords = getCanvasCoords(e);

    // Endpoint dragging candidate snap
    if (endpointDragState) {
      const snap = findNearestShapePort(coords, elements);
      setActiveSnap(snap);
      setEndpointDragState((prev) => (prev ? { ...prev, currentPos: coords } : null));
      return;
    }

    // Quick Connect handle drag candidate snap
    if (quickConnectDragState) {
      const snap = findNearestShapePort(coords, elements, quickConnectDragState.sourceId);
      setActiveSnap(snap);
      setQuickConnectDragState((prev) => (prev ? { ...prev, currentPos: coords } : null));
      return;
    }

    if (selectionBox) {
      setSelectionBox((prev) => (prev ? { ...prev, current: coords } : null));

      const minX = Math.min(selectionBox.start.x, coords.x);
      const maxX = Math.max(selectionBox.start.x, coords.x);
      const minY = Math.min(selectionBox.start.y, coords.y);
      const maxY = Math.max(selectionBox.start.y, coords.y);

      const enclosedIds = elements
        .filter((el) => {
          const bounds = getElementBounds(el);
          return bounds.x >= minX && bounds.x + bounds.width <= maxX && bounds.y >= minY && bounds.y + bounds.height <= maxY;
        })
        .map((el) => el.id);

      setSelectedIds(enclosedIds);
      return;
    }

    if (resizeState?.isResizing) {
      const dx = coords.x - resizeState.lastPos.x;
      const dy = coords.y - resizeState.lastPos.y;
      resizeElement(resizeState.targetId, resizeState.handle, dx, dy);
      setResizeState({ ...resizeState, lastPos: coords });
      return;
    }

    if (dragState.isDragging) {
      const dx = coords.x - dragState.lastPos.x;
      const dy = coords.y - dragState.lastPos.y;
      moveSelectedElements(dx, dy);
      setDragState({ ...dragState, lastPos: coords });
      setHoveredPort(null);
      if (activeSnap) setActiveSnap(null);
      return;
    }

    if (drawingState) {
      if (activeTool === 'arrow' || activeTool === 'line') {
        const snap = findNearestShapePort(coords, elements);
        setActiveSnap(snap);
      }
      setDrawingState((prev) =>
        prev
          ? {
              ...prev,
              current: coords,
              points: [...prev.points, coords],
            }
          : null
      );
      return;
    }

    // Clear stale snap ring when not performing an arrow creation/drag operation
    if (!endpointDragState && !quickConnectDragState) {
      if (activeSnap) setActiveSnap(null);
    }

    // Dynamic port hover detection for selected shape
    if (singleSelectedShape) {
      const el = singleSelectedShape;
      const ports = [
        { dir: 'top' as const, x: el.x + el.width / 2, y: el.y },
        { dir: 'right' as const, x: el.x + el.width, y: el.y + el.height / 2 },
        { dir: 'bottom' as const, x: el.x + el.width / 2, y: el.y + el.height },
        { dir: 'left' as const, x: el.x, y: el.y + el.height / 2 },
      ];

      let closestDir: 'top' | 'right' | 'bottom' | 'left' = 'right';
      let minD = Infinity;

      ports.forEach((p) => {
        const d = Math.hypot(coords.x - p.x, coords.y - p.y);
        if (d < minD) {
          minD = d;
          closestDir = p.dir;
        }
      });

      const isNearShape =
        coords.x >= el.x - 40 &&
        coords.x <= el.x + el.width + 40 &&
        coords.y >= el.y - 40 &&
        coords.y <= el.y + el.height + 40;

      if (isNearShape || minD < 60) {
        setHoveredPort({ elementId: el.id, dir: closestDir });
      } else {
        setHoveredPort(null);
      }
    } else {
      setHoveredPort(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore capture release errors
      }
      return;
    }

    const coords = getCanvasCoords(e);

    // Finish Endpoint Dragging
    if (endpointDragState) {
      const snap = findNearestShapePort(coords, elements);
      const targetPos = snap ? { x: snap.x, y: snap.y } : coords;
      reconnectArrowEndpoint(
        endpointDragState.arrowId,
        endpointDragState.endpoint,
        targetPos,
        snap?.elementId,
        snap?.port
      );
      setEndpointDragState(null);
      setActiveSnap(null);
      return;
    }

    // Finish Quick Connect Dragging
    if (quickConnectDragState) {
      const snap = findNearestShapePort(coords, elements, quickConnectDragState.sourceId);
      const sourceEl = elements.find((el) => el.id === quickConnectDragState.sourceId);

      if (snap && sourceEl) {
        // Connect source element to target element
        const arrowId = generateUniqueId();
        addElement({
          id: arrowId,
          type: 'arrow',
          x: Math.min(quickConnectDragState.startPos.x, snap.x),
          y: Math.min(quickConnectDragState.startPos.y, snap.y),
          width: Math.abs(snap.x - quickConnectDragState.startPos.x) || 10,
          height: Math.abs(snap.y - quickConnectDragState.startPos.y) || 10,
          startX: quickConnectDragState.startPos.x,
          startY: quickConnectDragState.startPos.y,
          endX: snap.x,
          endY: snap.y,
          routingStyle: 'orthogonal',
          fromElementId: quickConnectDragState.sourceId,
          fromPort: quickConnectDragState.fromPort,
          toElementId: snap.elementId,
          toPort: snap.port,
          strokeColor: sourceEl.strokeColor || '#3b82f6',
          strokeWidth: sourceEl.strokeWidth || 2,
        });
      } else if (sourceEl) {
        // Spawn a new shape at drop position & connect arrow
        const newShapeId = generateUniqueId();
        const arrowId = generateUniqueId();

        const newShape: WhiteboardElement = {
          ...sourceEl,
          id: newShapeId,
          x: coords.x - sourceEl.width / 2,
          y: coords.y - sourceEl.height / 2,
        };

        const targetPort = getOppositePort(quickConnectDragState.fromPort);
        let targetPortPos = { x: newShape.x, y: newShape.y + newShape.height / 2 };
        if (targetPort === 'top') {
          targetPortPos = { x: newShape.x + newShape.width / 2, y: newShape.y };
        } else if (targetPort === 'bottom') {
          targetPortPos = { x: newShape.x + newShape.width / 2, y: newShape.y + newShape.height };
        } else if (targetPort === 'right') {
          targetPortPos = { x: newShape.x + newShape.width, y: newShape.y + newShape.height / 2 };
        }

        const newArrow: WhiteboardElement = {
          id: arrowId,
          type: 'arrow',
          x: Math.min(quickConnectDragState.startPos.x, targetPortPos.x),
          y: Math.min(quickConnectDragState.startPos.y, targetPortPos.y),
          width: Math.abs(targetPortPos.x - quickConnectDragState.startPos.x) || 10,
          height: Math.abs(targetPortPos.y - quickConnectDragState.startPos.y) || 10,
          startX: quickConnectDragState.startPos.x,
          startY: quickConnectDragState.startPos.y,
          endX: targetPortPos.x,
          endY: targetPortPos.y,
          routingStyle: 'orthogonal',
          fromElementId: quickConnectDragState.sourceId,
          fromPort: quickConnectDragState.fromPort,
          toElementId: newShapeId,
          toPort: targetPort,
          strokeColor: sourceEl.strokeColor || '#3b82f6',
          strokeWidth: sourceEl.strokeWidth || 2,
        };

        addElement(newShape);
        addElement(newArrow);
        setSelectedIds([newShapeId]);
      }

      setQuickConnectDragState(null);
      setActiveSnap(null);
      return;
    }

    if (selectionBox) {
      setSelectionBox(null);
    }

    if (resizeState) {
      setResizeState(null);
    }

    if (dragState.isDragging) {
      setDragState({ isDragging: false, lastPos: { x: 0, y: 0 } });
    }

    if (!drawingState) return;

    const { start, current, points } = drawingState;
    const minX = Math.min(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const width = Math.max(30, Math.abs(current.x - start.x));
    const height = Math.max(30, Math.abs(current.y - start.y));

    const colorStyle = WHITEBOARD_COLORS[activeColor];
    const id = generateUniqueId();

    if (activeTool === 'rectangle') {
      addElement({
        id,
        type: 'rectangle',
        x: minX,
        y: minY,
        width,
        height,
        strokeColor: colorStyle.border,
        fillColor: colorStyle.bg,
        strokeWidth: activeStrokeWidth,
      });
    } else if (activeTool === 'circle') {
      addElement({
        id,
        type: 'circle',
        x: minX,
        y: minY,
        width,
        height,
        strokeColor: colorStyle.border,
        fillColor: colorStyle.bg,
        strokeWidth: activeStrokeWidth,
      });
    } else if (activeTool === 'diamond') {
      addElement({
        id,
        type: 'diamond',
        x: minX,
        y: minY,
        width,
        height,
        strokeColor: colorStyle.border,
        fillColor: colorStyle.bg,
        strokeWidth: activeStrokeWidth,
      });
    } else if (activeTool === 'cylinder') {
      addElement({
        id,
        type: 'cylinder',
        x: minX,
        y: minY,
        width,
        height,
        strokeColor: colorStyle.border,
        fillColor: colorStyle.bg,
        strokeWidth: activeStrokeWidth,
      });
    } else if (activeTool === 'arrow' || activeTool === 'line') {
      const fromPortSnap = findNearestShapePort(start, elements);
      const toPortSnap = findNearestShapePort(current, elements);

      let startX = fromPortSnap ? fromPortSnap.x : start.x;
      let startY = fromPortSnap ? fromPortSnap.y : start.y;
      let endX = toPortSnap ? toPortSnap.x : current.x;
      let endY = toPortSnap ? toPortSnap.y : current.y;

      let fromPort: 'top' | 'bottom' | 'left' | 'right' = fromPortSnap?.port || 'bottom';
      let toPort: 'top' | 'bottom' | 'left' | 'right' = toPortSnap?.port || 'top';

      if (fromPortSnap && toPortSnap) {
        const fromEl = elements.find((el) => el.id === fromPortSnap.elementId);
        const toEl = elements.find((el) => el.id === toPortSnap.elementId);
        if (fromEl && toEl) {
          const optimal = getOptimalPortPair(fromEl, toEl);
          startX = optimal.fromPos.x;
          startY = optimal.fromPos.y;
          endX = optimal.toPos.x;
          endY = optimal.toPos.y;
          fromPort = optimal.fromPort;
          toPort = optimal.toPort;
        }
      }

      addElement({
        id,
        type: activeTool,
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX) || 10,
        height: Math.abs(endY - startY) || 10,
        startX,
        startY,
        endX,
        endY,
        routingStyle: 'orthogonal',
        fromElementId: fromPortSnap?.elementId,
        fromPort,
        toElementId: toPortSnap?.elementId,
        toPort,
        strokeColor: colorStyle.border,
        strokeWidth: activeStrokeWidth,
      });
    } else if (activeTool === 'sticky') {
      addElement({
        id,
        type: 'sticky',
        x: start.x,
        y: start.y,
        width: 180,
        height: 180,
        text: 'New Sticky Note',
        color: activeColor,
        strokeColor: colorStyle.border,
        fillColor: colorStyle.bg,
        strokeWidth: 1,
      });
    } else if (activeTool === 'pencil') {
      addElement({
        id,
        type: 'pencil',
        x: minX,
        y: minY,
        width,
        height,
        points,
        strokeColor: colorStyle.border,
        strokeWidth: activeStrokeWidth,
      });
    } else if (activeTool === 'text') {
      addElement({
        id,
        type: 'text',
        x: start.x,
        y: start.y,
        width: 160,
        height: 40,
        text: 'Click to edit text',
        fontSize: 16,
        strokeColor: colorStyle.border,
        strokeWidth: 1,
      });
    }

    setDrawingState(null);
    setActiveSnap(null);
    setActiveTool('select');
  };

  const handleElementClick = (e: React.MouseEvent, el: WhiteboardElement) => {
    e.stopPropagation();
    if (activeTool === 'eraser') {
      deleteElements([el.id]);
      return;
    }
    if (activeTool === 'select') {
      if (e.shiftKey) {
        if (selectedIds.includes(el.id)) {
          setSelectedIds(selectedIds.filter((id) => id !== el.id));
        } else {
          setSelectedIds([...selectedIds, el.id]);
        }
      } else {
        setSelectedIds([el.id]);
      }
    }
  };

  const handleElementPointerDown = (e: React.PointerEvent, el: WhiteboardElement) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();

    if (!selectedIds.includes(el.id)) {
      if (e.shiftKey) {
        setSelectedIds([...selectedIds, el.id]);
      } else {
        setSelectedIds([el.id]);
      }
    }

    const coords = getCanvasCoords(e);
    setDragState({
      isDragging: true,
      lastPos: coords,
    });
  };

  const handleResizeHandlePointerDown = (e: React.PointerEvent, handle: ResizeHandle, targetId: string) => {
    e.stopPropagation();
    const coords = getCanvasCoords(e);
    setResizeState({
      isResizing: true,
      handle,
      targetId,
      lastPos: coords,
    });
  };

  const handleFitContent = () => {
    if (elements.length === 0) {
      reset();
      return;
    }
    const nodes = elements.map((el) => ({
      id: el.id,
      label: el.id,
      x: el.x,
      y: el.y,
      width: el.width || 100,
      height: el.height || 100,
      lines: [],
      attrs: {},
    }));
    fitToContent(nodes);
  };

  return {
    elements,
    selectedIds,
    activeTool,
    activeColor,
    activeFontFamily,
    setActiveFontFamily,
    activeFontSize,
    setActiveFontSize,
    isSpacePressed,
    isPanning: isPanningRef.current,
    isDraggingShape: dragState.isDragging,
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
    getCanvasCoords,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleElementClick,
    handleElementPointerDown,
    handleResizeHandlePointerDown,
    handleFitContent,
    spawnConnectedNode,
    deleteElements,
  };
}
