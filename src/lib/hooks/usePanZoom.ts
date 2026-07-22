'use client';

import { useCallback, useRef, useState } from 'react';
import type { LaidOutNode } from '@/lib/layout/types';

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;
const FIT_PADDING = 60; // px of breathing room around the diagram when fitting

export interface PanZoomState {
  scale: number;
  x: number;
  y: number;
}

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export function usePanZoom(initial: PanZoomState = { scale: 1, x: 0, y: 0 }) {
  const [transform, setTransform] = useState<PanZoomState>(initial);

  const isPanning = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Zoom while keeping the point under the cursor visually fixed —
  // without this, zooming feels like it "drifts" away from where
  // you're pointing, which is disorienting on a diagram canvas.
  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    setTransform((prev) => {
      const nextScale = clampScale(prev.scale - e.deltaY * ZOOM_SENSITIVITY * prev.scale);
      if (nextScale === prev.scale) return prev;

      // Point in "diagram space" currently under the cursor, before rescale.
      const diagramX = (pointerX - prev.x) / prev.scale;
      const diagramY = (pointerY - prev.y) / prev.scale;

      // Recompute pan so that same diagram-space point stays under the cursor.
      const nextX = pointerX - diagramX * nextScale;
      const nextY = pointerY - diagramY * nextScale;

      return { scale: nextScale, x: nextX, y: nextY };
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Left mouse button only.
    if (e.button !== 0) return;
    isPanning.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning.current || !lastPointer.current) return;

    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    isPanning.current = false;
    lastPointer.current = null;
    (e.target as Element).releasePointerCapture(e.pointerId);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setTransform((prev) => ({ ...prev, scale: clampScale(prev.scale * factor) }));
  }, []);

  const reset = useCallback(() => setTransform({ scale: 1, x: 0, y: 0 }), []);

  // Fits all given nodes' bounding box into the current viewport, with
  // padding, centered. Never zooms in past 1x just because a small
  // diagram would technically "fit" bigger.
  const fitToContent = useCallback((nodes: LaidOutNode[]) => {
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) {
      setTransform({ scale: 1, x: 0, y: 0 });
      return;
    }

    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const viewport = svg.getBoundingClientRect();
    const availableWidth = viewport.width - FIT_PADDING * 2;
    const availableHeight = viewport.height - FIT_PADDING * 2;

    const scaleToFitWidth = availableWidth / contentWidth;
    const scaleToFitHeight = availableHeight / contentHeight;
    const rawScale = Math.min(scaleToFitWidth, scaleToFitHeight, 1);
    const scale = clampScale(rawScale);

    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    const x = viewport.width / 2 - contentCenterX * scale;
    const y = viewport.height / 2 - contentCenterY * scale;

    setTransform({ scale, x, y });
  }, []);

  return {
    transform,
    svgRef,
    handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp },
    zoomIn: () => zoomBy(1.2),
    zoomOut: () => zoomBy(1 / 1.2),
    reset,
    fitToContent,
  };
}