import type { LaidOutNode } from "@/lib/layout/types";

interface Point {
   x: number;
   y: number;
}

// Finds where the line from a node's center toward another point exits
// that node's rectangle — used to draw edges starting/ending cleanly at
// a node's border instead of its center, for dynamically-routed edges.
export function clipToRectBoundary(
   node: LaidOutNode,
   towardPoint: Point,
): Point {
   const cx = node.x + node.width / 2;
   const cy = node.y + node.height / 2;
   const dx = towardPoint.x - cx;
   const dy = towardPoint.y - cy;

   if (dx === 0 && dy === 0) return { x: cx, y: cy };

   const halfW = node.width / 2;
   const halfH = node.height / 2;

   const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
   const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
   const scale = Math.min(scaleX, scaleY);

   return { x: cx + dx * scale, y: cy + dy * scale };
}

// Simple straight-line edge between two nodes, clipped to both
// rectangles' borders. Used as a fallback whenever either endpoint has
// been manually dragged — dagre's original routed path no longer makes
// sense once a node has moved off its auto-layout position.
export function straightEdgePath(
   source: LaidOutNode,
   target: LaidOutNode,
): Point[] {
   const sourceCenter = {
      x: source.x + source.width / 2,
      y: source.y + source.height / 2,
   };
   const targetCenter = {
      x: target.x + target.width / 2,
      y: target.y + target.height / 2,
   };

   const start = clipToRectBoundary(source, targetCenter);
   const end = clipToRectBoundary(target, sourceCenter);

   return [start, end];
}

// Finds the point at the halfway mark of the path's total arc length —
// correct for both a 2-point straight line and a multi-point routed
// path, unlike naively indexing into the points array (which picks the
// wrong point entirely for a 2-point path: floor(2/2)=1 is the END
// point, not the middle).
export function midpointOfPath(points: Point[]): Point {
   if (points.length === 0) return { x: 0, y: 0 };
   if (points.length === 1) return points[0];

   const segmentLengths: number[] = [];
   let totalLength = 0;

   for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segmentLengths.push(len);
      totalLength += len;
   }

   if (totalLength === 0) return points[0];

   const halfLength = totalLength / 2;
   let accumulated = 0;

   for (let i = 0; i < segmentLengths.length; i++) {
      const segLen = segmentLengths[i];
      if (accumulated + segLen >= halfLength) {
         const remaining = halfLength - accumulated;
         const t = segLen === 0 ? 0 : remaining / segLen;
         const start = points[i];
         const end = points[i + 1];
         return {
            x: start.x + (end.x - start.x) * t,
            y: start.y + (end.y - start.y) * t,
         };
      }
      accumulated += segLen;
   }

   return points[points.length - 1];
}

// Self-loop: draws a small loop out to the right of the node and back,
// since Dagre doesn't route edges from a node to itself at all.
export function selfLoopPath(node: LaidOutNode): Point[] {
   const loopOut = 50;
   const topY = node.y + node.height * 0.3;
   const bottomY = node.y + node.height * 0.7;
   const rightX = node.x + node.width;

   return [
      { x: rightX, y: topY },
      { x: rightX + loopOut, y: topY },
      { x: rightX + loopOut, y: bottomY },
      { x: rightX, y: bottomY },
   ];
}

// Same-rank sibling edge: routes below both boxes with a shallow arc,
// rather than a straight line through/behind other nodes at the same
// vertical position.
export function sameRankEdgePath(
   source: LaidOutNode,
   target: LaidOutNode,
): Point[] {
   const sourceBottom = {
      x: source.x + source.width / 2,
      y: source.y + source.height,
   };
   const targetBottom = {
      x: target.x + target.width / 2,
      y: target.y + target.height,
   };
   const dropY = Math.max(sourceBottom.y, targetBottom.y) + 30;

   return [
      sourceBottom,
      { x: sourceBottom.x, y: dropY },
      { x: targetBottom.x, y: dropY },
      targetBottom,
   ];
}

// True when Dagre's own routed points are too sparse/degenerate to
// trust — fewer than 2 points, or start and end essentially coincide
// (which happens for same-rank edges Dagre couldn't route cleanly).
export function isDegenerateRoute(points: Point[]): boolean {
   if (points.length < 2) return true;
   const first = points[0];
   const last = points[points.length - 1];
   const dx = last.x - first.x;
   const dy = last.y - first.y;
   return Math.sqrt(dx * dx + dy * dy) < 4;
}
