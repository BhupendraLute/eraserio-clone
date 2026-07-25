"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LaidOutNode } from "@/lib/layout/types";

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

   // Smooth scroll-to-pan animation state — start aligned with the initial transform
   const scrollTargetRef = useRef<PanZoomState>({ ...initial });
   const transformRef = useRef(transform);

   // Keep the transform ref in sync (for detecting external transform changes)
   useEffect(() => {
      transformRef.current = transform;
   }, [transform]);
   const scrollRafRef = useRef<number | null>(null);
   const SCROLL_EASE_LERP = 0.12;
   const SCROLL_SNAP_THRESHOLD = 0.5;

   function cancelSmoothScroll() {
      if (scrollRafRef.current !== null) {
         cancelAnimationFrame(scrollRafRef.current);
         scrollRafRef.current = null;
      }
   }

   function ensureSmoothScroll() {
      if (scrollRafRef.current !== null) return; // already animating

      const animate = () => {
         setTransform((prev) => {
            const target = scrollTargetRef.current;
            const dx = target.x - prev.x;
            const dy = target.y - prev.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < SCROLL_SNAP_THRESHOLD) {
               scrollRafRef.current = null;
               return { ...prev, x: target.x, y: target.y };
            }

            // Adaptive ease — faster when farther from target
            const ease = Math.min(0.2, SCROLL_EASE_LERP + dist * 0.003);
            scrollRafRef.current = requestAnimationFrame(animate);
            return {
               ...prev,
               x: prev.x + dx * ease,
               y: prev.y + dy * ease,
            };
         });
      };

      scrollRafRef.current = requestAnimationFrame(animate);
   }

   // Touch gesture state for two-finger pan/pinch
   // Uses direct addEventListener with { passive: false } to guarantee
   // preventDefault() works (React's synthetic events may be passive).
   const touchStateRef = useRef<{
      initialPinchDist: number;
      initialScale: number;
      initialMidX: number;
      initialMidY: number;
      initialX: number;
      initialY: number;
   } | null>(null);

   const handleTouchStart = useCallback((e: TouchEvent) => {
      if (e.touches.length === 2) {
         e.preventDefault();
         cancelSmoothScroll();

         const t1 = e.touches[0];
         const t2 = e.touches[1];
         const dx = t2.clientX - t1.clientX;
         const dy = t2.clientY - t1.clientY;
         const dist = Math.sqrt(dx * dx + dy * dy);

         touchStateRef.current = {
            initialPinchDist: dist,
            initialScale: transformRef.current.scale,
            initialMidX: (t1.clientX + t2.clientX) / 2,
            initialMidY: (t1.clientY + t2.clientY) / 2,
            initialX: transformRef.current.x,
            initialY: transformRef.current.y,
         };
      }
   }, []);

   const handleTouchMove = useCallback((e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current) {
         e.preventDefault();

         const svg = svgRef.current;
         if (!svg) return;
         const rect = svg.getBoundingClientRect();

         const t1 = e.touches[0];
         const t2 = e.touches[1];
         const dx = t2.clientX - t1.clientX;
         const dy = t2.clientY - t1.clientY;
         const dist = Math.sqrt(dx * dx + dy * dy);

         const midX = (t1.clientX + t2.clientX) / 2;
         const midY = (t1.clientY + t2.clientY) / 2;

         const state = touchStateRef.current;
         const scaleFactor = dist / state.initialPinchDist;
         const newScale = clampScale(state.initialScale * scaleFactor);

         // The canvas-space point under the initial midpoint
         const canvasPointX = (state.initialMidX - rect.left - state.initialX) / state.initialScale;
         const canvasPointY = (state.initialMidY - rect.top - state.initialY) / state.initialScale;

         // New pan to keep that canvas point under the current midpoint at the new scale
         const newX = midX - rect.left - canvasPointX * newScale;
         const newY = midY - rect.top - canvasPointY * newScale;

         setTransform({ scale: newScale, x: newX, y: newY });
      }
   }, []);

   const handleTouchEnd = useCallback((e: TouchEvent) => {
      if (e.touches.length < 2) {
         touchStateRef.current = null;
      }
   }, []);

   // Attach non-passive touch listeners directly to the SVG element
   // to guarantee preventDefault() suppresses pointer event synthesis.
   useEffect(() => {
      const svg = svgRef.current;
      if (!svg) return;

      svg.addEventListener('touchstart', handleTouchStart, { passive: false });
      svg.addEventListener('touchmove', handleTouchMove, { passive: false });
      svg.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
         svg.removeEventListener('touchstart', handleTouchStart);
         svg.removeEventListener('touchmove', handleTouchMove);
         svg.removeEventListener('touchend', handleTouchEnd);
      };
   }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

   // Cleanup smooth scroll animation on unmount
   useEffect(() => {
      return () => cancelSmoothScroll();
   }, []);

   // Zoom while keeping the point under the cursor visually fixed.
   // When Ctrl/Meta is held, scroll zooms in/out.
   // Without modifier, scroll pans the canvas.
   const SCROLL_PAN_FACTOR = 1.5;
   const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();

      const svg = svgRef.current;
      if (!svg) return;

      // Ctrl / Cmd + Scroll → zoom (snap, no smooth scroll)
      if (e.ctrlKey || e.metaKey) {
         cancelSmoothScroll();
         const rect = svg.getBoundingClientRect();
         const pointerX = e.clientX - rect.left;
         const pointerY = e.clientY - rect.top;

         setTransform((prev) => {
            const nextScale = clampScale(
               prev.scale - e.deltaY * ZOOM_SENSITIVITY * prev.scale,
            );
            if (nextScale === prev.scale) return prev;

            // Point in "diagram space" currently under the cursor, before rescale.
            const diagramX = (pointerX - prev.x) / prev.scale;
            const diagramY = (pointerY - prev.y) / prev.scale;

            // Recompute pan so that same diagram-space point stays under the cursor.
            const nextX = pointerX - diagramX * nextScale;
            const nextY = pointerY - diagramY * nextScale;

            return { scale: nextScale, x: nextX, y: nextY };
         });
         return;
      }

      // Plain scroll → smooth pan canvas with easing
      // Use transformRef.current as base so external transform changes
      // (drag-pan, reset, fit, zoom buttons) don't desync the target.
      const current = transformRef.current;
      scrollTargetRef.current = {
         ...current,
         x: current.x - e.deltaX * SCROLL_PAN_FACTOR,
         y: current.y - e.deltaY * SCROLL_PAN_FACTOR,
      };
      ensureSmoothScroll();
   }, []);

   const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
      // Left mouse button only — cancel any in-flight smooth scroll
      if (e.button !== 0) return;
      cancelSmoothScroll();
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
      cancelSmoothScroll();
      setTransform((prev) => ({
         ...prev,
         scale: clampScale(prev.scale * factor),
      }));
   }, []);

   const reset = useCallback(() => {
      cancelSmoothScroll();
      setTransform({ scale: 1, x: 0, y: 0 });
   }, []);

   // Fits all given nodes' bounding box into the current viewport, with
   // padding, centered. Never zooms in past 1x just because a small
   // diagram would technically "fit" bigger.
   const fitToContent = useCallback((nodes: LaidOutNode[]) => {
      cancelSmoothScroll();
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

   // Fits a known width x height content box into the viewport, centered.
   // Simpler variant of fitToContent for layouts (like sequence diagrams)
   // that already produce an overall bounding box rather than a node list.
   const fitBounds = useCallback(
      (contentWidth: number, contentHeight: number) => {
         cancelSmoothScroll();
         const svg = svgRef.current;
         if (!svg || contentWidth <= 0 || contentHeight <= 0) {
            setTransform({ scale: 1, x: 0, y: 0 });
            return;
         }

         const viewport = svg.getBoundingClientRect();
         const availableWidth = viewport.width - FIT_PADDING * 2;
         const availableHeight = viewport.height - FIT_PADDING * 2;

         const scaleToFitWidth = availableWidth / contentWidth;
         const scaleToFitHeight = availableHeight / contentHeight;
         const rawScale = Math.min(scaleToFitWidth, scaleToFitHeight, 1);
         const scale = clampScale(rawScale);

         const x = viewport.width / 2 - (contentWidth / 2) * scale;
         const y = viewport.height / 2 - (contentHeight / 2) * scale;

         setTransform({ scale, x, y });
      },
      [],
   );

   return {
      transform,
      svgRef,
      setTransform,
      handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp },
      zoomIn: () => zoomBy(1.2),
      zoomOut: () => zoomBy(1 / 1.2),
      reset,
      fitToContent,
      fitBounds,
   };
}
