'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import type {
  WhiteboardElement,
  ResizeHandle,
  CloudIconKind,
  Point,
} from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { ICON_CATALOG } from '@/lib/icons/icon-catalog';
import { DiagramPreview } from '@/components/docs/DiagramPreview';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { Trash2, Server, Plus, Minus, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePanZoom } from '@/lib/hooks/usePanZoom';

/**
 * Calculates Eraser.io directional orthogonal elbow connector paths with clearance stubs and smooth arc bends.
 */
function getDirectionalOrthogonalPathD(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromPort: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
  toPort: 'top' | 'bottom' | 'left' | 'right' = 'top',
  cornerRadius: number = 12,
  stubLength: number = 24
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (Math.hypot(dx, dy) < 5) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Stub 1 (extending outwards from start port)
  let s1x = x1;
  let s1y = y1;
  if (fromPort === 'right') s1x += stubLength;
  else if (fromPort === 'left') s1x -= stubLength;
  else if (fromPort === 'bottom') s1y += stubLength;
  else if (fromPort === 'top') s1y -= stubLength;

  // Stub 2 (extending outwards from end port)
  let s2x = x2;
  let s2y = y2;
  if (toPort === 'right') s2x += stubLength;
  else if (toPort === 'left') s2x -= stubLength;
  else if (toPort === 'bottom') s2y += stubLength;
  else if (toPort === 'top') s2y -= stubLength;

  const isFromHorizontal = fromPort === 'left' || fromPort === 'right';
  const isToHorizontal = toPort === 'left' || toPort === 'right';

  const parts: string[] = [`M ${x1} ${y1}`, `L ${s1x} ${s1y}`];

  // Case 1: Both ports horizontal
  if (isFromHorizontal && isToHorizontal) {
    const midX = s1x + (s2x - s1x) / 2;
    const sY = s2y >= s1y ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(midX - s1x), Math.abs(s2y - s1y) / 2);

    if (r > 2 && Math.abs(s2y - s1y) > 4) {
      const sX1 = s1x < s2x ? 1 : -1;
      parts.push(
        `L ${midX - r * sX1} ${s1y}`,
        `Q ${midX} ${s1y}, ${midX} ${s1y + r * sY}`,
        `L ${midX} ${s2y - r * sY}`,
        `Q ${midX} ${s2y}, ${midX + r * sX1} ${s2y}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${midX} ${s1y}`, `L ${midX} ${s2y}`, `L ${s2x} ${s2y}`);
    }
  }
  // Case 2: Both ports vertical
  else if (!isFromHorizontal && !isToHorizontal) {
    const midY = s1y + (s2y - s1y) / 2;
    const sX = s2x >= s1x ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(midY - s1y), Math.abs(s2x - s1x) / 2);

    if (r > 2 && Math.abs(s2x - s1x) > 4) {
      const sY1 = s1y < s2y ? 1 : -1;
      parts.push(
        `L ${s1x} ${midY - r * sY1}`,
        `Q ${s1x} ${midY}, ${s1x + r * sX} ${midY}`,
        `L ${s2x - r * sX} ${midY}`,
        `Q ${s2x} ${midY}, ${s2x} ${midY + r * sY1}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${s1x} ${midY}`, `L ${s2x} ${midY}`, `L ${s2x} ${s2y}`);
    }
  }
  // Case 3: One horizontal, one vertical
  else if (isFromHorizontal && !isToHorizontal) {
    const cornerX = s2x;
    const cornerY = s1y;
    const sX = cornerX >= s1x ? 1 : -1;
    const sY = s2y >= cornerY ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(cornerX - s1x), Math.abs(s2y - cornerY));

    if (r > 2) {
      parts.push(
        `L ${cornerX - r * sX} ${cornerY}`,
        `Q ${cornerX} ${cornerY}, ${cornerX} ${cornerY + r * sY}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${cornerX} ${cornerY}`, `L ${s2x} ${s2y}`);
    }
  }
  // Case 4: One vertical, one horizontal
  else {
    const cornerX = s1x;
    const cornerY = s2y;
    const sY = cornerY >= s1y ? 1 : -1;
    const sX = s2x >= cornerX ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(cornerY - s1y), Math.abs(s2x - cornerX));

    if (r > 2) {
      parts.push(
        `L ${cornerX} ${cornerY - r * sY}`,
        `Q ${cornerX} ${cornerY}, ${cornerX + r * sX} ${cornerY}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${cornerX} ${cornerY}`, `L ${s2x} ${s2y}`);
    }
  }

  parts.push(`L ${x2} ${y2}`);
  return parts.join(' ');
}

function getOptimalPortPair(fromEl: WhiteboardElement, toEl: WhiteboardElement) {
  const portsA: { port: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
    { port: 'top', x: fromEl.x + fromEl.width / 2, y: fromEl.y },
    { port: 'bottom', x: fromEl.x + fromEl.width / 2, y: fromEl.y + fromEl.height },
    { port: 'left', x: fromEl.x, y: fromEl.y + fromEl.height / 2 },
    { port: 'right', x: fromEl.x + fromEl.width, y: fromEl.y + fromEl.height / 2 },
  ];

  const portsB: { port: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
    { port: 'top', x: toEl.x + toEl.width / 2, y: toEl.y },
    { port: 'bottom', x: toEl.x + toEl.width / 2, y: toEl.y + toEl.height },
    { port: 'left', x: toEl.x, y: toEl.y + toEl.height / 2 },
    { port: 'right', x: toEl.x + toEl.width, y: toEl.y + toEl.height / 2 },
  ];

  let bestPair = {
    fromPort: portsA[1].port,
    fromPos: { x: portsA[1].x, y: portsA[1].y },
    toPort: portsB[0].port,
    toPos: { x: portsB[0].x, y: portsB[0].y },
    minDist: Infinity,
  };

  portsA.forEach((pA) => {
    portsB.forEach((pB) => {
      const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      if (dist < bestPair.minDist) {
        bestPair = {
          fromPort: pA.port,
          fromPos: { x: pA.x, y: pA.y },
          toPort: pB.port,
          toPos: { x: pB.x, y: pB.y },
          minDist: dist,
        };
      }
    });
  });

  return bestPair;
}

interface ShapePortSnap {
  elementId: string;
  port: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
}

function findNearestShapePort(
  pt: { x: number; y: number },
  elements: WhiteboardElement[],
  ignoreElementId?: string
): ShapePortSnap | null {
  let closest: ShapePortSnap | null = null;
  let minDistance = 60;

  elements.forEach((el) => {
    if (el.id === ignoreElementId) return;
    if (el.type === 'arrow' || el.type === 'line' || el.type === 'pencil') return;

    const ports: { port: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
      { port: 'top', x: el.x + el.width / 2, y: el.y },
      { port: 'bottom', x: el.x + el.width / 2, y: el.y + el.height },
      { port: 'left', x: el.x, y: el.y + el.height / 2 },
      { port: 'right', x: el.x + el.width, y: el.y + el.height / 2 },
    ];

    ports.forEach((p) => {
      const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = { elementId: el.id, port: p.port, x: p.x, y: p.y };
      }
    });
  });

  return closest;
}

function generateUniqueId(): string {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function WhiteboardCanvas() {
  const elements = useWhiteboardStore((s) => s.elements);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const activeColor = useWhiteboardStore((s) => s.activeColor);
  const activeStrokeWidth = useWhiteboardStore((s) => s.activeStrokeWidth);

  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const addElement = useWhiteboardStore((s) => s.addElement);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const setSelectedIds = useWhiteboardStore((s) => s.setSelectedIds);
  const clearSelection = useWhiteboardStore((s) => s.clearSelection);
  const moveSelectedElements = useWhiteboardStore((s) => s.moveSelectedElements);
  const resizeElement = useWhiteboardStore((s) => s.resizeElement);
  const spawnConnectedNode = useWhiteboardStore((s) => s.spawnConnectedNode);
  const reconnectArrowEndpoint = useWhiteboardStore((s) => s.reconnectArrowEndpoint);

  const diagrams = useWorkspaceStore((s) => s.diagrams);

  // Pan & Zoom Engine
  const { transform, svgRef, handlers, zoomIn, zoomOut, reset, fitToContent } = usePanZoom();
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

  const handlePointerMove = (e: React.PointerEvent) => {
    // Handle Canvas Panning
    if (isPanningRef.current && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.pointerX;
      const dy = e.clientY - panStartRef.current.pointerY;
      handlers.onPointerMove({
        ...e,
        clientX: e.clientX,
        clientY: e.clientY,
      } as any);
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
          return el.x >= minX && el.x + el.width <= maxX && el.y >= minY && el.y + el.height <= maxY;
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

        const targetPort = 'left';
        const targetPortPos = { x: newShape.x, y: newShape.y + newShape.height / 2 };

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

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const hasSelection = selectedElements.length > 0;
  const singleSelectedShape =
    selectedElements.length === 1 &&
    !['arrow', 'line', 'pencil'].includes(selectedElements[0].type)
      ? selectedElements[0]
      : null;

  const renderCloudIconSvg = (kind: CloudIconKind | string, color: string) => {
    const matched = ICON_CATALOG.find((item) => item.kind === kind);
    if (matched && matched.icon) {
      const IconComponent = matched.icon;
      if (
        typeof IconComponent === 'function' ||
        (typeof IconComponent === 'object' && IconComponent !== null && (IconComponent as unknown as { render?: unknown }).render)
      ) {
        return (
          <div style={{ color }}>
            <IconComponent className="h-6 w-6" />
          </div>
        );
      }
    }
    return (
      <div style={{ color }}>
        <Server className="h-6 w-6" />
      </div>
    );
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
          cursor: isPanningRef.current ? 'grabbing' : isSpacePressed ? 'grab' : 'crosshair',
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
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>

        <rect width="100%" height="100%" fill="url(#wb-grid)" />

        {/* World Space Group transformed by Zoom & Pan */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Existing Elements */}
          {elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);

            if (el.type === 'rectangle') {
              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rx={6}
                    fill={el.fillColor ?? 'transparent'}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth}
                    className="cursor-pointer"
                  />
                </g>
              );
            }

            if (el.type === 'circle') {
              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <ellipse
                    cx={el.x + el.width / 2}
                    cy={el.y + el.height / 2}
                    rx={el.width / 2}
                    ry={el.height / 2}
                    fill={el.fillColor ?? 'transparent'}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth}
                    className="cursor-pointer"
                  />
                </g>
              );
            }

            if (el.type === 'diamond') {
              const cx = el.x + el.width / 2;
              const cy = el.y + el.height / 2;
              const points = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <polygon
                    points={points}
                    fill={el.fillColor ?? 'transparent'}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth}
                    className="cursor-pointer"
                  />
                </g>
              );
            }

            if (el.type === 'arrow') {
              const isOrthogonal = el.routingStyle !== 'straight';
              const pathD = isOrthogonal
                ? getDirectionalOrthogonalPathD(
                    el.startX,
                    el.startY,
                    el.endX,
                    el.endY,
                    el.fromPort || 'right',
                    el.toPort || 'left'
                  )
                : `M ${el.startX} ${el.startY} L ${el.endX} ${el.endY}`;

              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd="url(#wb-arrowhead)"
                    className="cursor-pointer"
                  />
                  {/* Draggable Endpoint Handles for Selected Arrows */}
                  {isSelected && (
                    <>
                      <circle
                        cx={el.startX}
                        cy={el.startY}
                        r={6}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-grab hover:scale-125 transition-transform"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        onPointerDown={(evt) => {
                          evt.stopPropagation();
                          setEndpointDragState({
                            arrowId: el.id,
                            endpoint: 'start',
                            currentPos: { x: el.startX, y: el.startY },
                          });
                        }}
                      />
                      <circle
                        cx={el.endX}
                        cy={el.endY}
                        r={6}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-grab hover:scale-125 transition-transform"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        onPointerDown={(evt) => {
                          evt.stopPropagation();
                          setEndpointDragState({
                            arrowId: el.id,
                            endpoint: 'end',
                            currentPos: { x: el.endX, y: el.endY },
                          });
                        }}
                      />
                    </>
                  )}
                </g>
              );
            }

            if (el.type === 'line') {
              const isOrthogonal = el.routingStyle !== 'straight';
              const pathD = isOrthogonal
                ? getDirectionalOrthogonalPathD(
                    el.startX,
                    el.startY,
                    el.endX,
                    el.endY,
                    el.fromPort || 'right',
                    el.toPort || 'left'
                  )
                : `M ${el.startX} ${el.startY} L ${el.endX} ${el.endY}`;

              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="cursor-pointer"
                  />
                  {isSelected && (
                    <>
                      <circle
                        cx={el.startX}
                        cy={el.startY}
                        r={6}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-grab hover:scale-125 transition-transform"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        onPointerDown={(evt) => {
                          evt.stopPropagation();
                          setEndpointDragState({
                            arrowId: el.id,
                            endpoint: 'start',
                            currentPos: { x: el.startX, y: el.startY },
                          });
                        }}
                      />
                      <circle
                        cx={el.endX}
                        cy={el.endY}
                        r={6}
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth={2}
                        className="cursor-grab hover:scale-125 transition-transform"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        onPointerDown={(evt) => {
                          evt.stopPropagation();
                          setEndpointDragState({
                            arrowId: el.id,
                            endpoint: 'end',
                            currentPos: { x: el.endX, y: el.endY },
                          });
                        }}
                      />
                    </>
                  )}
                </g>
              );
            }

            if (el.type === 'sticky') {
              const style = WHITEBOARD_COLORS[el.color];
              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rx={8}
                    fill={style.bg}
                    stroke={style.border}
                    strokeWidth={2}
                    className="cursor-pointer shadow-md"
                  />
                  <foreignObject x={el.x + 8} y={el.y + 8} width={el.width - 16} height={el.height - 16}>
                    <textarea
                      value={el.text}
                      onChange={(evt) => updateElement(el.id, { text: evt.target.value })}
                      className="h-full w-full resize-none bg-transparent font-medium outline-none select-none"
                      style={{
                        color: style.text,
                        fontSize: `${el.fontSize ?? 12}px`,
                        fontFamily: el.fontFamily ?? 'inherit',
                        fontWeight: el.fontWeight ?? 'normal',
                        fontStyle: el.fontStyle ?? 'normal',
                        textAlign: el.textAlign ?? 'center',
                      }}
                    />
                  </foreignObject>
                </g>
              );
            }

            if (el.type === 'text') {
              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <foreignObject x={el.x} y={el.y} width={Math.max(140, el.width)} height={Math.max(40, el.height)}>
                    <input
                      type="text"
                      value={el.text}
                      onChange={(evt) => updateElement(el.id, { text: evt.target.value })}
                      className="h-full w-full bg-transparent font-semibold outline-none select-none"
                      style={{
                        color: el.strokeColor,
                        fontSize: `${el.fontSize ?? 16}px`,
                        fontFamily: el.fontFamily ?? 'inherit',
                        fontWeight: el.fontWeight ?? 'bold',
                        fontStyle: el.fontStyle ?? 'normal',
                        textAlign: el.textAlign ?? 'left',
                      }}
                    />
                  </foreignObject>
                </g>
              );
            }

            if (el.type === 'cloud') {
              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rx={10}
                    fill={el.fillColor ?? 'var(--background)'}
                    stroke={el.strokeColor}
                    strokeWidth={el.strokeWidth}
                    className="cursor-pointer shadow-sm"
                  />
                  <foreignObject x={el.x + (el.width - 24) / 2} y={el.y + (el.height - 24) / 2} width={24} height={24}>
                    {renderCloudIconSvg(el.iconKind, el.strokeColor)}
                  </foreignObject>
                </g>
              );
            }

            if (el.type === 'diagram') {
              const diagramRecord = diagrams.find((d) => d.id === el.diagramId);
              return (
                <g key={el.id} onPointerDown={(e) => handleElementPointerDown(e, el)} onClick={(e) => handleElementClick(e, el)}>
                  <rect
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.height}
                    rx={8}
                    fill="var(--background)"
                    stroke={isSelected ? '#3b82f6' : 'var(--border)'}
                    strokeWidth={isSelected ? 2 : 1}
                    className="cursor-pointer shadow-sm"
                  />
                  <foreignObject x={el.x + 8} y={el.y + 8} width={el.width - 16} height={el.height - 16} className="pointer-events-none">
                    {diagramRecord ? (
                      <div className="h-full w-full overflow-hidden select-none pointer-events-none">
                        <div className="mb-1 text-[10px] font-semibold text-muted-foreground">
                          {diagramRecord.name}
                        </div>
                        <DiagramPreview source={diagramRecord.source} />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground select-none pointer-events-none">
                        Diagram not found
                      </div>
                    )}
                  </foreignObject>
                </g>
              );
            }

            return null;
          })}

          {/* Live Active Drawing Preview */}
          {drawingState && (
            <g>
              {activeTool === 'rectangle' && (
                <rect
                  x={Math.min(drawingState.start.x, drawingState.current.x)}
                  y={Math.min(drawingState.start.y, drawingState.current.y)}
                  width={Math.abs(drawingState.current.x - drawingState.start.x)}
                  height={Math.abs(drawingState.current.y - drawingState.start.y)}
                  rx={6}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
              {activeTool === 'circle' && (
                <ellipse
                  cx={(drawingState.start.x + drawingState.current.x) / 2}
                  cy={(drawingState.start.y + drawingState.current.y) / 2}
                  rx={Math.abs(drawingState.current.x - drawingState.start.x) / 2}
                  ry={Math.abs(drawingState.current.y - drawingState.start.y) / 2}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}
              {(activeTool === 'arrow' || activeTool === 'line') && (
                <path
                  d={getDirectionalOrthogonalPathD(
                    drawingState.start.x,
                    drawingState.start.y,
                    activeSnap ? activeSnap.x : drawingState.current.x,
                    activeSnap ? activeSnap.y : drawingState.current.y,
                    'right',
                    activeSnap ? activeSnap.port : 'left'
                  )}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  markerEnd={activeTool === 'arrow' ? 'url(#wb-arrowhead)' : undefined}
                />
              )}
            </g>
          )}

          {/* Live Quick-Connect Drag Preview */}
          {quickConnectDragState && (
            <g>
              <path
                d={getDirectionalOrthogonalPathD(
                  quickConnectDragState.startPos.x,
                  quickConnectDragState.startPos.y,
                  activeSnap ? activeSnap.x : quickConnectDragState.currentPos.x,
                  activeSnap ? activeSnap.y : quickConnectDragState.currentPos.y,
                  quickConnectDragState.fromPort,
                  activeSnap ? activeSnap.port : 'left'
                )}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="4 4"
                markerEnd="url(#wb-arrowhead)"
              />
            </g>
          )}

          {/* Dynamic Snap Ring Indicator */}
          {activeSnap && (
            <g key="active-snap-ring">
              <circle
                cx={activeSnap.x}
                cy={activeSnap.y}
                r={10}
                fill="rgba(59, 130, 246, 0.25)"
                stroke="#3b82f6"
                strokeWidth={2}
                className="animate-ping"
              />
              <circle cx={activeSnap.x} cy={activeSnap.y} r={4} fill="#3b82f6" />
            </g>
          )}

          {/* Multi-element Drag Rect Selection Box */}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.start.x, selectionBox.current.x)}
              y={Math.min(selectionBox.start.y, selectionBox.current.y)}
              width={Math.abs(selectionBox.current.x - selectionBox.start.x)}
              height={Math.abs(selectionBox.current.y - selectionBox.start.y)}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Selection Bounding Box & 8 Resize Handles */}
          {selectedElements.map((el) => (
            <g key={`select-box-${el.id}`}>
              <rect
                x={el.x - 2}
                y={el.y - 2}
                width={el.width + 4}
                height={el.height + 4}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              {[
                { handle: 'tl', x: el.x - 5, y: el.y - 5 },
                { handle: 'tc', x: el.x + el.width / 2 - 4, y: el.y - 5 },
                { handle: 'tr', x: el.x + el.width - 3, y: el.y - 5 },
                { handle: 'ml', x: el.x - 5, y: el.y + el.height / 2 - 4 },
                { handle: 'mr', x: el.x + el.width - 3, y: el.y + el.height / 2 - 4 },
                { handle: 'bl', x: el.x - 5, y: el.y + el.height - 3 },
                { handle: 'bc', x: el.x + el.width / 2 - 4, y: el.y + el.height - 3 },
                { handle: 'br', x: el.x + el.width - 3, y: el.y + el.height - 3 },
              ].map((h) => (
                <rect
                  key={h.handle}
                  x={h.x}
                  y={h.y}
                  width={8}
                  height={8}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  className="cursor-nwse-resize"
                  onPointerDown={(e) =>
                    handleResizeHandlePointerDown(e, h.handle as ResizeHandle, el.id)
                  }
                />
              ))}
            </g>
          ))}

          {/* Eraser.io Dynamic Side-Hover Quick-Connect Flow Handles (+) */}
          {singleSelectedShape && (
            <g key={`quick-connect-${singleSelectedShape.id}`}>
              {[
                {
                  dir: 'top' as const,
                  cx: singleSelectedShape.x + singleSelectedShape.width / 2,
                  cy: singleSelectedShape.y - 18,
                },
                {
                  dir: 'right' as const,
                  cx: singleSelectedShape.x + singleSelectedShape.width + 18,
                  cy: singleSelectedShape.y + singleSelectedShape.height / 2,
                },
                {
                  dir: 'bottom' as const,
                  cx: singleSelectedShape.x + singleSelectedShape.width / 2,
                  cy: singleSelectedShape.y + singleSelectedShape.height + 18,
                },
                {
                  dir: 'left' as const,
                  cx: singleSelectedShape.x - 18,
                  cy: singleSelectedShape.y + singleSelectedShape.height / 2,
                },
              ].map((qc) => {
                const isHovered =
                  hoveredPort?.elementId === singleSelectedShape.id && hoveredPort.dir === qc.dir;

                return (
                  <g key={`qc-${qc.dir}`}>
                    {isHovered ? (
                      <g
                        className="cursor-pointer group"
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          spawnConnectedNode(singleSelectedShape.id, qc.dir);
                        }}
                        onPointerDown={(evt) => {
                          evt.stopPropagation();
                          setQuickConnectDragState({
                            sourceId: singleSelectedShape.id,
                            fromPort: qc.dir,
                            startPos: { x: qc.cx, y: qc.cy },
                            currentPos: { x: qc.cx, y: qc.cy },
                          });
                        }}
                      >
                        <circle
                          cx={qc.cx}
                          cy={qc.cy}
                          r={11}
                          fill="#3b82f6"
                          className="transition-all duration-150 scale-110 shadow-lg"
                          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        />
                        <path
                          d={`M ${qc.cx - 4} ${qc.cy} L ${qc.cx + 4} ${qc.cy} M ${qc.cx} ${qc.cy - 4} L ${qc.cx} ${qc.cy + 4}`}
                          stroke="#ffffff"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </g>
                    ) : (
                      <circle
                        cx={qc.cx}
                        cy={qc.cy}
                        r={3.5}
                        fill="var(--background)"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        className="opacity-50 transition-opacity hover:opacity-100 cursor-pointer"
                        onPointerEnter={() =>
                          setHoveredPort({ elementId: singleSelectedShape.id, dir: qc.dir })
                        }
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}
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
