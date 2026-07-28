'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import type {
  WhiteboardElement,
  ResizeHandle,
  Point,
  PortDirection,
} from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS, isConnectorElement, getElementBounds, getShapePorts, isPolygonShapeType } from '@/lib/whiteboard/whiteboard-types';
import {
  findNearestShapePort,
  getOptimalPortPair,
  getOppositePort,
  determineAutoRoutingStyle,
  ShapePortSnap,
} from '@/lib/whiteboard/orthogonal-routing';
import { generateId } from '@/lib/utils';
import type { PanZoomState } from '@/lib/hooks/usePanZoom';
import type { LaidOutNode } from '@/lib/layout/types';

interface UseWhiteboardInteractionsProps {
  transform: PanZoomState;
  setTransform: React.Dispatch<React.SetStateAction<PanZoomState>>;
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
  setTransform,
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
  const activeLineStyle = useWhiteboardStore((s) => s.activeLineStyle);
  const activeStrokeHex = useWhiteboardStore((s) => s.activeStrokeHex);
  const activeFillHex = useWhiteboardStore((s) => s.activeFillHex);
  const activeRoutingStyle = useWhiteboardStore((s) => s.activeRoutingStyle);
  const activeCornerRadius = useWhiteboardStore((s) => s.activeCornerRadius);
  const activeArrowheadStyle = useWhiteboardStore((s) => s.activeArrowheadStyle);
  const activeStartArrowheadStyle = useWhiteboardStore((s) => s.activeStartArrowheadStyle);
  const activeIsAnimated = useWhiteboardStore((s) => s.activeIsAnimated);
  const activeCloudIcon = useWhiteboardStore((s) => s.activeCloudIcon);

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
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const copyToClipboard = useWhiteboardStore((s) => s.copyToClipboard);
  const pasteFromClipboard = useWhiteboardStore((s) => s.pasteFromClipboard);
  const groupSelected = useWhiteboardStore((s) => s.groupSelected);
  const ungroupSelected = useWhiteboardStore((s) => s.ungroupSelected);
  const undo = useWhiteboardStore((s) => s.undo);
  const redo = useWhiteboardStore((s) => s.redo);

  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number } | null>(null);

  const [drawingState, setDrawingState] = useState<{
    start: Point;
    current: Point;
    points: Point[];
  } | null>(null);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    lastPos: Point;
    startPositions?: Map<string, Point>;
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

  const [endpointDragState, setEndpointDragState] = useState<{
    arrowId: string;
    endpoint: 'start' | 'end' | 'waypoint';
    currentPos: Point;
  } | null>(null);

  const [quickConnectDragState, setQuickConnectDragState] = useState<{
    sourceId: string;
    fromPort: PortDirection;
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

  const [editingElementId, setEditingElementId] = useState<string | null>(null);

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
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDownWindow);
    window.addEventListener('keyup', handleKeyUpWindow);
    return () => {
      window.removeEventListener('keydown', handleKeyDownWindow);
      window.removeEventListener('keyup', handleKeyUpWindow);
    };
  }, [isSpacePressed]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName?.toLowerCase();
      const isInputFocused = ['input', 'textarea', 'select'].includes(tag) || target.isContentEditable;

      // Ctrl/Cmd + key shortcuts (work even when input is focused for clipboard)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'c':
            if (!isInputFocused && selectedIds.length > 0) {
              e.preventDefault();
              copyToClipboard();
            }
            return;
          case 'v':
            if (!isInputFocused) {
              e.preventDefault();
              pasteFromClipboard();
            }
            return;
          case 'd':
            e.preventDefault();
            duplicateSelected();
            return;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) redo(); else undo();
            return;
          case 'y':
            e.preventDefault();
            redo();
            return;
          case 'g':
            e.preventDefault();
            if (e.shiftKey) ungroupSelected(); else groupSelected();
            return;
          case 'a':
            if (!isInputFocused) {
              e.preventDefault();
              setSelectedIds(elements.map((el) => el.id));
            }
            return;
        }
        return;
      }

      if (isInputFocused) return;

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); return;
        case 'r': setActiveTool('rectangle'); return;
        case 'o': setActiveTool('circle'); return;
        case 'd': setActiveTool('diamond'); return;
        case 'y': setActiveTool('cylinder'); return;
        case 'a': setActiveTool('arrow'); return;
        case 'l': setActiveTool('line'); return;
        case 'p': setActiveTool('pencil'); return;
        case 't': setActiveTool('text'); return;
        case 'f': setActiveTool('frame'); return;
        case 'c': setActiveTool('comment'); return;
        case 'e': setActiveTool('eraser'); return;
        case 'b': setActiveTool('badge'); return;
        case 'delete':
        case 'backspace':
          if (selectedIds.length > 0) {
            e.preventDefault();
            deleteElements(selectedIds);
          }
          return;
        case 'escape':
          clearSelection();
          setActiveTool('select');
          setEditingElementId(null);
          return;
      }

      // Tab: spawn connected node
      if (e.key === 'Tab' && selectedIds.length === 1) {
        const selectedEl = elements.find((el) => el.id === selectedIds[0]);
        if (selectedEl && !isConnectorElement(selectedEl) && selectedEl.type !== 'pencil') {
          e.preventDefault();
          spawnConnectedNode(selectedIds[0], 'right');
        }
      }

      // Arrow keys: nudge selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 72 : 12;
          const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
          const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
          moveSelectedElements(dx, dy);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, setActiveTool, deleteElements, clearSelection, duplicateSelected, copyToClipboard, pasteFromClipboard, groupSelected, ungroupSelected, undo, redo, moveSelectedElements, spawnConnectedNode, setSelectedIds]);

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

  const handlePointerDown = (e: React.PointerEvent) => {
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

    const isSvgChild = svgRef.current?.contains(e.target as Node);
    if (!isSvgChild) return;

    const coords = getCanvasCoords(e);

    if (activeTool === 'select') {
      setSelectionBox({ start: coords, current: coords });
      clearSelection();
      setEditingElementId(null);
      return;
    }

    if (['rectangle', 'circle', 'diamond', 'cylinder', 'arrow', 'line', 'sticky', 'pencil', 'text', 'frame', 'cloud', 'comment'].includes(activeTool)) {
      setDrawingState({ start: coords, current: coords, points: [coords] });
    }
  };

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
  const hasSelection = selectedElements.length > 0;
  const singleSelectedShape =
    selectedElements.length === 1 && !isConnectorElement(selectedElements[0]) && selectedElements[0].type !== 'pencil'
      ? selectedElements[0]
      : null;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanningRef.current && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.pointerX;
      const dy = e.clientY - panStartRef.current.pointerY;
      setTransform((prev) => ({
        ...prev,
        x: panStartRef.current!.startX + dx,
        y: panStartRef.current!.startY + dy,
      }));
      return;
    }

    const coords = getCanvasCoords(e);

    if (endpointDragState) {
      const snap = findNearestShapePort(coords, elements);
      setActiveSnap(snap);
      setEndpointDragState((prev) => (prev ? { ...prev, currentPos: coords } : null));
      return;
    }

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
        prev ? { ...prev, current: coords, points: [...prev.points, coords] } : null
      );
      return;
    }

    if (!endpointDragState && !quickConnectDragState) {
      if (activeSnap) setActiveSnap(null);
    }

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
        if (d < minD) { minD = d; closestDir = p.dir; }
      });
      const isNearShape = coords.x >= el.x - 40 && coords.x <= el.x + el.width + 40 && coords.y >= el.y - 40 && coords.y <= el.y + el.height + 40;
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
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
      return;
    }

    const coords = getCanvasCoords(e);

    if (endpointDragState) {
      if (endpointDragState.endpoint === 'waypoint') {
        updateElement(endpointDragState.arrowId, { waypoint: coords });
      } else {
        const snap = findNearestShapePort(coords, elements);
        const targetPos = snap ? { x: snap.x, y: snap.y } : coords;
        reconnectArrowEndpoint(endpointDragState.arrowId, endpointDragState.endpoint, targetPos, snap?.elementId, snap?.port);
      }
      setEndpointDragState(null);
      setActiveSnap(null);
      return;
    }

    if (quickConnectDragState) {
      const snap = findNearestShapePort(coords, elements, quickConnectDragState.sourceId);
      const sourceEl = elements.find((el) => el.id === quickConnectDragState.sourceId);
      if (snap && sourceEl) {
        const arrowId = generateId();
        addElement({
          id: arrowId, type: 'arrow',
          x: Math.min(quickConnectDragState.startPos.x, snap.x), y: Math.min(quickConnectDragState.startPos.y, snap.y),
          width: Math.abs(snap.x - quickConnectDragState.startPos.x) || 10, height: Math.abs(snap.y - quickConnectDragState.startPos.y) || 10,
          startX: quickConnectDragState.startPos.x, startY: quickConnectDragState.startPos.y,
          endX: snap.x, endY: snap.y,
          routingStyle: activeRoutingStyle, lineStyle: activeLineStyle,
          arrowheadStyle: activeArrowheadStyle, startArrowheadStyle: activeStartArrowheadStyle, arrowheadColor: sourceEl.strokeColor || '#3b82f6',
          fromElementId: quickConnectDragState.sourceId, fromPort: quickConnectDragState.fromPort,
          toElementId: snap.elementId, toPort: snap.port,
          strokeColor: sourceEl.strokeColor || '#3b82f6', strokeWidth: sourceEl.strokeWidth || 2,
        });
      } else if (sourceEl) {
        const newShapeId = generateId();
        const arrowId = generateId();
        const newShape: WhiteboardElement = { ...sourceEl, id: newShapeId, x: coords.x - sourceEl.width / 2, y: coords.y - sourceEl.height / 2 };
        const targetPort = getOppositePort(quickConnectDragState.fromPort);
        let targetPortPos = { x: newShape.x, y: newShape.y + newShape.height / 2 };
        if (targetPort === 'top') targetPortPos = { x: newShape.x + newShape.width / 2, y: newShape.y };
        else if (targetPort === 'bottom') targetPortPos = { x: newShape.x + newShape.width / 2, y: newShape.y + newShape.height };
        else if (targetPort === 'right') targetPortPos = { x: newShape.x + newShape.width, y: newShape.y + newShape.height / 2 };

        const newArrow: WhiteboardElement = {
          id: arrowId, type: 'arrow',
          x: Math.min(quickConnectDragState.startPos.x, targetPortPos.x), y: Math.min(quickConnectDragState.startPos.y, targetPortPos.y),
          width: Math.abs(targetPortPos.x - quickConnectDragState.startPos.x) || 10, height: Math.abs(targetPortPos.y - quickConnectDragState.startPos.y) || 10,
          startX: quickConnectDragState.startPos.x, startY: quickConnectDragState.startPos.y,
          endX: targetPortPos.x, endY: targetPortPos.y,
          routingStyle: activeRoutingStyle, lineStyle: activeLineStyle,
          arrowheadStyle: activeArrowheadStyle, startArrowheadStyle: activeStartArrowheadStyle, arrowheadColor: sourceEl.strokeColor || '#3b82f6',
          fromElementId: quickConnectDragState.sourceId, fromPort: quickConnectDragState.fromPort,
          toElementId: newShapeId, toPort: targetPort,
          strokeColor: sourceEl.strokeColor || '#3b82f6', strokeWidth: sourceEl.strokeWidth || 2,
        };
        addElement(newShape);
        addElement(newArrow);
        setSelectedIds([newShapeId]);
      }
      setQuickConnectDragState(null);
      setActiveSnap(null);
      return;
    }

    if (selectionBox) setSelectionBox(null);
    if (resizeState) setResizeState(null);
    if (dragState.isDragging) setDragState({ isDragging: false, lastPos: { x: 0, y: 0 } });
    if (!drawingState) return;

    const { start, current, points } = drawingState;
    const minX = Math.min(start.x, current.x);
    const minY = Math.min(start.y, current.y);
    const width = Math.max(30, Math.abs(current.x - start.x));
    const height = Math.max(30, Math.abs(current.y - start.y));

    const strokeHex = activeStrokeHex || 'currentColor';
    const fillHex = activeFillHex || 'transparent';
    const id = generateId();

    if (isPolygonShapeType(activeTool)) {
      const activeFillStyle = useWhiteboardStore.getState().activeFillStyle || 'plain';
      const activeLineStyle = useWhiteboardStore.getState().activeLineStyle || 'solid';
      const shapeW = activeTool === 'square' ? Math.max(width, height) : width;
      const shapeH = activeTool === 'square' ? Math.max(width, height) : height;
      addElement({
        id,
        type: activeTool as any,
        x: minX,
        y: minY,
        width: shapeW,
        height: shapeH,
        strokeColor: strokeHex,
        fillColor: fillHex,
        strokeWidth: activeStrokeWidth,
        lineStyle: activeLineStyle,
        fillStyle: activeFillStyle,
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
          startX = optimal.fromPos.x; startY = optimal.fromPos.y;
          endX = optimal.toPos.x; endY = optimal.toPos.y;
          fromPort = optimal.fromPort; toPort = optimal.toPort;
        }
      }
      const initialRouting = activeTool === 'line' ? 'straight' : determineAutoRoutingStyle({ x: startX, y: startY }, { x: endX, y: endY }, fromPort, toPort);
      addElement({
        id, type: activeTool, x: Math.min(startX, endX), y: Math.min(startY, endY),
        width: Math.abs(endX - startX) || 10, height: Math.abs(endY - startY) || 10,
        startX, startY, endX, endY,
        routingStyle: activeTool === 'line' ? 'straight' : initialRouting,
        isUserRoutingStyle: activeTool === 'line' ? true : false,
        lineStyle: activeLineStyle,
        arrowheadStyle: activeTool === 'arrow' ? activeArrowheadStyle : undefined,
        startArrowheadStyle: activeTool === 'arrow' ? activeStartArrowheadStyle : undefined,
        arrowheadColor: activeTool === 'arrow' ? strokeHex : undefined,
        fromElementId: fromPortSnap?.elementId, fromPort,
        toElementId: toPortSnap?.elementId, toPort,
        strokeColor: strokeHex, strokeWidth: activeStrokeWidth,
        isAnimated: activeIsAnimated,
      });
    } else if (activeTool === 'pencil') {
      addElement({
        id, type: 'pencil', x: minX, y: minY, width, height, points,
        strokeColor: strokeHex, strokeWidth: activeStrokeWidth,
      });
    } else if (activeTool === 'text') {
      addElement({
        id, type: 'text', x: start.x, y: start.y, width: 160, height: 40,
        text: 'Click to edit text', fontSize: 16,
        strokeColor: strokeHex, strokeWidth: 1,
      });
    } else if (activeTool === 'comment') {
      addElement({
        id, type: 'comment', x: start.x - 16, y: start.y - 16, width: 200, height: 80,
        text: 'Add a comment...', author: 'You', resolved: false,
        color: activeColor, strokeColor: strokeHex, fillColor: fillHex, strokeWidth: 1,
      });
    } else if (activeTool === 'cloud') {
      const rawW = Math.abs(current.x - start.x);
      const rawH = Math.abs(current.y - start.y);
      const isSingleClick = rawW < 15 && rawH < 15;
      const side = isSingleClick ? 64 : Math.max(Math.max(rawW, rawH), 32);
      const finalX = isSingleClick ? start.x - 32 : minX;
      const finalY = isSingleClick ? start.y - 32 : minY;
      addElement({
        id,
        type: 'cloud',
        x: finalX,
        y: finalY,
        width: side,
        height: side,
        iconKind: activeCloudIcon,
        strokeColor: strokeHex,
        fillColor: fillHex,
        strokeWidth: activeStrokeWidth,
      });
    }

    setSelectedIds([id]);
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

  const handleElementDoubleClick = (e: React.MouseEvent, el: WhiteboardElement) => {
    e.stopPropagation();
    if (['text', 'frame', 'comment'].includes(el.type)) {
      setEditingElementId(el.id);
    } else if (['rectangle', 'circle', 'diamond', 'cylinder', 'arrow', 'line'].includes(el.type)) {
      setEditingElementId(el.id);
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
    setDragState({ isDragging: true, lastPos: coords });
  };

  const handleResizeHandlePointerDown = (e: React.PointerEvent, handle: ResizeHandle, targetId: string) => {
    e.stopPropagation();
    const coords = getCanvasCoords(e);
    setResizeState({ isResizing: true, handle, targetId, lastPos: coords });
  };

  const handleFitContent = () => {
    if (elements.length === 0) { reset(); return; }
    const nodes = elements.map((el) => ({
      id: el.id, label: el.id, x: el.x, y: el.y,
      width: el.width || 100, height: el.height || 100,
      lines: [], attrs: {},
    }));
    fitToContent(nodes);
  };

  const handleFitSelection = () => {
    if (selectedElements.length === 0) { handleFitContent(); return; }
    const nodes = selectedElements.map((el) => ({
      id: el.id, label: el.id, x: el.x, y: el.y,
      width: el.width || 100, height: el.height || 100,
      lines: [], attrs: {},
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

  };
}
