"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LaidOutNode } from "@/lib/layout/types";

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;
const FIT_PADDING = 60; // px of breathing room around the diagram when fitting
const FIT_MAX_SCALE = 2; // max zoom-in for fit operations (small diagrams fill viewport up to 2×)
const ANIM_LERP = 0.12;
const ANIM_SNAP_THRESHOLD = 0.3;

export interface PanZoomState {
   scale: number;
   x: number;
   y: number;
}

export interface UsePanZoomOptions {
   initial?: PanZoomState;
   minScale?: number;
   maxScale?: number;
   enableKeyboardShortcuts?: boolean;
   onReset?: () => void;
}

function clampScale(s: number, min = MIN_SCALE, max = MAX_SCALE) {
   return Math.min(max, Math.max(min, s));
}

export function usePanZoom(
   optionsOrInitial: PanZoomState | UsePanZoomOptions = { scale: 1, x: 0, y: 0 }
) {
   const options = useMemo<UsePanZoomOptions>(() => {
      if ('scale' in optionsOrInitial) {
         return { initial: optionsOrInitial as PanZoomState };
      }
      return optionsOrInitial as UsePanZoomOptions;
   }, [optionsOrInitial]);

   const initial = options.initial ?? { scale: 1, x: 0, y: 0 };
   const minScale = options.minScale ?? MIN_SCALE;
   const maxScale = options.maxScale ?? MAX_SCALE;
   const enableKeyboardShortcuts = options.enableKeyboardShortcuts ?? false;

   const [transform, setTransform] = useState<PanZoomState>(initial);

   const isPanning = useRef(false);
   const lastPointer = useRef<{ x: number; y: number } | null>(null);
   const containerRef = useRef<SVGSVGElement | HTMLElement | null>(null);
   const svgRef = containerRef as unknown as React.RefObject<SVGSVGElement | null>;
   const [containerEl, setContainerEl] = useState<SVGSVGElement | HTMLElement | null>(null);

   // Sync containerEl state whenever containerRef.current attaches/mounts
   useEffect(() => {
      if (containerRef.current !== containerEl) {
         setContainerEl(containerRef.current);
      }
   }, [containerEl]);

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

   // --- Animated transition state (for fit / reset / button zoom) ---
   const animTargetRef = useRef<PanZoomState | null>(null);
   const animRafRef = useRef<number | null>(null);

   const cancelAnim = useCallback(() => {
      if (animRafRef.current !== null) {
         cancelAnimationFrame(animRafRef.current);
         animRafRef.current = null;
      }
      animTargetRef.current = null;
   }, []);

   const cancelSmoothScroll = useCallback(() => {
      if (scrollRafRef.current !== null) {
         cancelAnimationFrame(scrollRafRef.current);
         scrollRafRef.current = null;
      }
   }, []);

   /** Smoothly animate from the current transform to a target transform. */
   const animateTo = useCallback((target: PanZoomState) => {
      cancelSmoothScroll();
      cancelAnim();
      animTargetRef.current = target;

      const step = () => {
         setTransform((prev) => {
            const t = animTargetRef.current;
            if (!t) return prev;

            const dx = t.x - prev.x;
            const dy = t.y - prev.y;
            const ds = t.scale - prev.scale;
            const dist = Math.sqrt(dx * dx + dy * dy + (ds * 500) ** 2);

            if (dist < ANIM_SNAP_THRESHOLD) {
               animRafRef.current = null;
               animTargetRef.current = null;
               return { scale: t.scale, x: t.x, y: t.y };
            }

            const ease = Math.min(0.25, ANIM_LERP + dist * 0.002);
            animRafRef.current = requestAnimationFrame(step);
            return {
               scale: prev.scale + ds * ease,
               x: prev.x + dx * ease,
               y: prev.y + dy * ease,
            };
         });
      };

      animRafRef.current = requestAnimationFrame(step);
   }, [cancelSmoothScroll, cancelAnim]);

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
   }, [cancelSmoothScroll]);

   const handleTouchMove = useCallback((e: TouchEvent) => {
      if (e.touches.length === 2 && touchStateRef.current) {
         e.preventDefault();

         const container = containerRef.current;
         if (!container) return;
         const rect = container.getBoundingClientRect();

         const t1 = e.touches[0];
         const t2 = e.touches[1];
         const dx = t2.clientX - t1.clientX;
         const dy = t2.clientY - t1.clientY;
         const dist = Math.sqrt(dx * dx + dy * dy);

         const midX = (t1.clientX + t2.clientX) / 2;
         const midY = (t1.clientY + t2.clientY) / 2;

         const state = touchStateRef.current;
         const scaleFactor = dist / state.initialPinchDist;
         const newScale = clampScale(state.initialScale * scaleFactor, minScale, maxScale);

         // The canvas-space point under the initial midpoint
         const canvasPointX = (state.initialMidX - rect.left - state.initialX) / state.initialScale;
         const canvasPointY = (state.initialMidY - rect.top - state.initialY) / state.initialScale;

         // New pan to keep that canvas point under the current midpoint at the new scale
         const newX = midX - rect.left - canvasPointX * newScale;
         const newY = midY - rect.top - canvasPointY * newScale;

         setTransform({ scale: newScale, x: newX, y: newY });
      }
   }, [minScale, maxScale]);

   const handleTouchEnd = useCallback((e: TouchEvent) => {
      if (e.touches.length < 2) {
         touchStateRef.current = null;
      }
   }, []);

   // Zoom while keeping the point under the cursor visually fixed.
   // When Ctrl/Meta is held, scroll zooms in/out.
   // Without modifier, scroll pans the canvas.
   const SCROLL_PAN_FACTOR = 1.5;
   const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement | HTMLElement> | WheelEvent) => {
      if ((e as unknown as { __wheelHandled?: boolean }).__wheelHandled) return;
      (e as unknown as { __wheelHandled?: boolean }).__wheelHandled = true;

      e.preventDefault();

      const container = containerRef.current || (e.currentTarget as HTMLElement | SVGSVGElement | null);
      if (!container) return;

      // Ctrl / Cmd + Scroll → zoom (snap, no smooth scroll)
      if (e.ctrlKey || e.metaKey) {
         cancelSmoothScroll();
         const rect = container.getBoundingClientRect();
         const pointerX = e.clientX - rect.left;
         const pointerY = e.clientY - rect.top;

         let dy = e.deltaY;
         if (e.deltaMode === 1) dy *= 16;
         else if (e.deltaMode === 2) dy *= 800;

         setTransform((prev) => {
            const nextScale = clampScale(
               prev.scale - dy * ZOOM_SENSITIVITY * prev.scale,
               minScale,
               maxScale,
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
      const base = scrollRafRef.current !== null ? scrollTargetRef.current : transformRef.current;
      scrollTargetRef.current = {
         scale: base.scale,
         x: base.x - e.deltaX * SCROLL_PAN_FACTOR,
         y: base.y - e.deltaY * SCROLL_PAN_FACTOR,
      };
      ensureSmoothScroll();
   }, [cancelSmoothScroll, minScale, maxScale]);

   // Attach non-passive touch and wheel listeners directly to the container element
   useEffect(() => {
      const container = containerEl || containerRef.current;
      if (!container) return;

      const handleTouchStartNative = (e: Event) => handleTouchStart(e as TouchEvent);
      const handleTouchMoveNative = (e: Event) => handleTouchMove(e as TouchEvent);
      const handleTouchEndNative = (e: Event) => handleTouchEnd(e as TouchEvent);
      const handleWheelNative = (e: Event) => onWheel(e as WheelEvent);

      container.addEventListener('touchstart', handleTouchStartNative, { passive: false });
      container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
      container.addEventListener('touchend', handleTouchEndNative, { passive: true });
      container.addEventListener('wheel', handleWheelNative, { passive: false });

      return () => {
         container.removeEventListener('touchstart', handleTouchStartNative);
         container.removeEventListener('touchmove', handleTouchMoveNative);
         container.removeEventListener('touchend', handleTouchEndNative);
         container.removeEventListener('wheel', handleWheelNative);
      };
   }, [containerEl, handleTouchStart, handleTouchMove, handleTouchEnd, onWheel]);

   // Globally suppress browser's predefined Ctrl / Cmd + wheel page zoom
   useEffect(() => {
      const suppressBrowserZoom = (e: WheelEvent) => {
         if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
         }
      };

      window.addEventListener('wheel', suppressBrowserZoom, { passive: false });
      return () => {
         window.removeEventListener('wheel', suppressBrowserZoom);
      };
   }, []);

   // Cleanup animations on unmount
   useEffect(() => {
      return () => {
         cancelSmoothScroll();
         cancelAnim();
      };
   }, [cancelSmoothScroll, cancelAnim]);

   const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement | HTMLElement>) => {
      if (e.button !== 0 && e.button !== 1) return;
      cancelSmoothScroll();
      isPanning.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      (e.target as Element).setPointerCapture?.(e.pointerId);
   }, [cancelSmoothScroll]);

   const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement | HTMLElement>) => {
      if (!isPanning.current || !lastPointer.current) return;

      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
   }, []);

   const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement | HTMLElement>) => {
      isPanning.current = false;
      lastPointer.current = null;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
   }, []);

   const zoomBy = useCallback((factor: number) => {
      cancelSmoothScroll();
      cancelAnim();
      const container = containerRef.current;
      setTransform((prev) => {
         const nextScale = clampScale(prev.scale * factor, minScale, maxScale);
         if (nextScale === prev.scale) return prev;

         // Zoom toward viewport center so content doesn't drift to top-left
         const rect = container?.getBoundingClientRect();
         const cx = (rect?.width ?? 0) / 2;
         const cy = (rect?.height ?? 0) / 2;

         const diagramX = (cx - prev.x) / prev.scale;
         const diagramY = (cy - prev.y) / prev.scale;

         return {
            scale: nextScale,
            x: cx - diagramX * nextScale,
            y: cy - diagramY * nextScale,
         };
      });
   }, [cancelSmoothScroll, cancelAnim, minScale, maxScale]);

   const zoomIn = useCallback((factor?: number | unknown) => {
      const f = typeof factor === 'number' ? factor : 1.2;
      zoomBy(f);
   }, [zoomBy]);

   const zoomOut = useCallback((factor?: number | unknown) => {
      const f = typeof factor === 'number' ? factor : 1.2;
      zoomBy(1 / f);
   }, [zoomBy]);

   const reset = useCallback(() => {
      if (options.onReset) {
         options.onReset();
         return;
      }
      animateTo({ scale: 1, x: 0, y: 0 });
   }, [animateTo, options]);

   // Centralized optional keyboard shortcut listener
   useEffect(() => {
      if (!enableKeyboardShortcuts) return;

      const handleKeyDown = (e: KeyboardEvent) => {
         const target = e.target as HTMLElement;
         const tag = target.tagName?.toLowerCase();
         const isInputFocused = ['input', 'textarea', 'select'].includes(tag) || target.isContentEditable;

         if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
               case '=':
               case '+':
                  if (!isInputFocused) {
                     e.preventDefault();
                     zoomIn();
                  }
                  return;
               case '-':
               case '_':
                  if (!isInputFocused) {
                     e.preventDefault();
                     zoomOut();
                  }
                  return;
               case '0':
                  e.preventDefault();
                  reset();
                  return;
            }
         }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [enableKeyboardShortcuts, zoomIn, zoomOut, reset]);

   // Fits all given nodes' bounding box into the current viewport, with
   // padding, centered. For small diagrams, zooms in up to FIT_MAX_SCALE.
   const fitToContent = useCallback((nodes: LaidOutNode[]) => {
      const container = containerRef.current;
      if (!container || nodes.length === 0) {
         animateTo({ scale: 1, x: 0, y: 0 });
         return;
      }

      const minX = Math.min(...nodes.map((n) => n.x));
      const minY = Math.min(...nodes.map((n) => n.y));
      const maxX = Math.max(...nodes.map((n) => n.x + n.width));
      const maxY = Math.max(...nodes.map((n) => n.y + n.height));

      const contentWidth = Math.max(maxX - minX, 10);
      const contentHeight = Math.max(maxY - minY, 10);

      const viewport = container.getBoundingClientRect();
      const availableWidth = viewport.width - FIT_PADDING * 2;
      const availableHeight = viewport.height - FIT_PADDING * 2;

      const scaleToFitWidth = availableWidth / contentWidth;
      const scaleToFitHeight = availableHeight / contentHeight;
      const rawScale = Math.min(scaleToFitWidth, scaleToFitHeight, FIT_MAX_SCALE);
      const scale = clampScale(rawScale, minScale, maxScale);

      const contentCenterX = minX + contentWidth / 2;
      const contentCenterY = minY + contentHeight / 2;

      const x = viewport.width / 2 - contentCenterX * scale;
      const y = viewport.height / 2 - contentCenterY * scale;

      animateTo({ scale, x, y });
   }, [animateTo, minScale, maxScale]);

   // Fits a known width x height content box into the viewport, centered.
   const fitBounds = useCallback(
      (contentWidth: number, contentHeight: number) => {
         const container = containerRef.current;
         if (!container || contentWidth <= 0 || contentHeight <= 0) {
            animateTo({ scale: 1, x: 0, y: 0 });
            return;
         }

         const viewport = container.getBoundingClientRect();
         const availableWidth = viewport.width - FIT_PADDING * 2;
         const availableHeight = viewport.height - FIT_PADDING * 2;

         const scaleToFitWidth = availableWidth / contentWidth;
         const scaleToFitHeight = availableHeight / contentHeight;
         const rawScale = Math.min(scaleToFitWidth, scaleToFitHeight, FIT_MAX_SCALE);
         const scale = clampScale(rawScale, minScale, maxScale);

         const x = viewport.width / 2 - (contentWidth / 2) * scale;
         const y = viewport.height / 2 - (contentHeight / 2) * scale;

         animateTo({ scale, x, y });
      },
      [animateTo, minScale, maxScale],
   );

   return {
      transform,
      scale: transform.scale,
      pan: { x: transform.x, y: transform.y },
      containerRef,
      svgRef,
      setTransform,
      handlers: { onWheel, onPointerDown, onPointerMove, onPointerUp },
      zoomIn,
      zoomOut,
      reset,
      fitToContent,
      fitBounds,
   };
}

