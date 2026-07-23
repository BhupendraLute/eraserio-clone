"use client";

import { useEffect, useRef } from "react";
import { useDiagramStore } from "@/lib/store/diagram-store";
import type { LaidOutEdge, LaidOutNode } from "@/lib/layout/types";
import { measureTextWidth } from "@/lib/layout/text-measure";
import { usePanZoom } from "@/lib/hooks/usePanZoom";
import { straightEdgePath, midpointOfPath } from "@/lib/render/edge-geometry";
import {
   resolveIconName,
   resolveNodeColor,
   ICON_SIZE,
   ICON_GAP,
} from "@/lib/render/node-style";
import { NodeIcon } from "@/components/editor/NodeIcon";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Maximize } from "lucide-react";
import {
   EDGE_LABEL_FONT,
   EDGE_LABEL_FONT_SIZE,
   EDGE_LABEL_PADDING_X,
   EDGE_LABEL_PADDING_Y,
   NODE_LINE_HEIGHT,
} from "@/lib/render/text-style";

const ARROW_SIZE = 8;

export function FlowchartCanvas() {
   const nodes = useDiagramStore((s) => s.nodes);
   const edges = useDiagramStore((s) => s.edges);
   const nodeOverrides = useDiagramStore((s) => s.nodeOverrides);
   const setNodePosition = useDiagramStore((s) => s.setNodePosition);
   const resetNodePosition = useDiagramStore((s) => s.resetNodePosition);
   const { transform, svgRef, handlers, zoomIn, zoomOut, fitToContent } =
      usePanZoom();

   const setSvgElement = useDiagramStore((s) => s.setSvgElement);
   useEffect(() => {
      setSvgElement(svgRef.current);
      return () => setSvgElement(null);
   }, [svgRef, setSvgElement]);

   const hasAutoFitted = useRef(false);
   useEffect(() => {
      if (!hasAutoFitted.current && nodes.length > 0) {
         fitToContent(nodes);
         hasAutoFitted.current = true;
      }
   }, [nodes, fitToContent]);

   const nodesById = new Map(nodes.map((n) => [n.id, n]));

   return (
      <div className="relative h-full w-full overflow-hidden bg-muted/20">
         <svg
            ref={svgRef}
            className="h-full w-full touch-none"
            onWheel={handlers.onWheel}
            onPointerDown={handlers.onPointerDown}
            onPointerMove={handlers.onPointerMove}
            onPointerUp={handlers.onPointerUp}
            style={{ cursor: "grab" }}
         >
            <defs>
               <marker
                  id="arrowhead"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth={ARROW_SIZE}
                  markerHeight={ARROW_SIZE}
                  orient="auto-start-reverse"
               >
                  <path
                     d="M0,0 L10,5 L0,10 z"
                     className="fill-current text-muted-foreground"
                  />
               </marker>
            </defs>

            <g
               transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
            >
               {edges.map((edge, i) => {
                  const isDynamic = Boolean(
                     nodeOverrides[edge.from] || nodeOverrides[edge.to],
                  );
                  const sourceNode = nodesById.get(edge.from);
                  const targetNode = nodesById.get(edge.to);
                  return (
                     <EdgeView
                        key={`${edge.from}-${edge.to}-${i}`}
                        edge={edge}
                        isDynamic={isDynamic}
                        sourceNode={sourceNode}
                        targetNode={targetNode}
                     />
                  );
               })}

               {nodes.map((node) => (
                  <NodeView
                     key={node.id}
                     node={node}
                     scale={transform.scale}
                     onDrag={setNodePosition}
                     onResetPosition={resetNodePosition}
                  />
               ))}
            </g>
         </svg>

         <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-md border bg-background p-1 shadow-sm">
            <Button
               variant="ghost"
               size="icon"
               onClick={zoomIn}
               aria-label="Zoom in"
            >
               <Plus className="h-4 w-4" />
            </Button>
            <Button
               variant="ghost"
               size="icon"
               onClick={zoomOut}
               aria-label="Zoom out"
            >
               <Minus className="h-4 w-4" />
            </Button>
            <Button
               variant="ghost"
               size="icon"
               onClick={() => fitToContent(nodes)}
               aria-label="Fit to content"
            >
               <Maximize className="h-4 w-4" />
            </Button>
         </div>

         <div className="absolute bottom-4 left-4 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm">
            {Math.round(transform.scale * 100)}%
         </div>
      </div>
   );
}

interface NodeViewProps {
   node: LaidOutNode;
   scale: number;
   onDrag: (id: string, x: number, y: number) => void;
   onResetPosition: (id: string) => void;
}

function NodeView({ node, scale, onDrag, onResetPosition }: NodeViewProps) {
   const dragStart = useRef<{
      pointerX: number;
      pointerY: number;
      nodeX: number;
      nodeY: number;
   } | null>(null);

   const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      dragStart.current = {
         pointerX: e.clientX,
         pointerY: e.clientY,
         nodeX: node.x,
         nodeY: node.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
   };

   const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
      if (!dragStart.current) return;
      e.stopPropagation();

      const dx = (e.clientX - dragStart.current.pointerX) / scale;
      const dy = (e.clientY - dragStart.current.pointerY) / scale;

      onDrag(
         node.id,
         dragStart.current.nodeX + dx,
         dragStart.current.nodeY + dy,
      );
   };

   const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
      e.stopPropagation();
      dragStart.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
   };

   const handleDoubleClick = (e: React.MouseEvent<SVGGElement>) => {
      e.stopPropagation();
      onResetPosition(node.id);
   };

   const iconName = resolveIconName(node.attrs.icon);
   const color = resolveNodeColor(node.attrs.color);
   const hasIcon = iconName !== null;

   // Text block shifts right to make room for the icon, and the whole
   // label+icon group is centered together within the node.
   const iconSpace = hasIcon ? ICON_SIZE + ICON_GAP : 0;
   const contentCenterX = node.x + node.width / 2;
   const textCenterX = contentCenterX + iconSpace / 2;
   const iconX =
      textCenterX -
      Math.max(
         ...node.lines.map((l) => measureTextWidth(l, "13px ui-sans-serif")),
      ) /
         2 -
      iconSpace +
      ICON_GAP / 2;

   const blockHeight = node.lines.length * NODE_LINE_HEIGHT;
   const iconY = node.y + node.height / 2 - ICON_SIZE / 2;

   return (
      <g
         onPointerDown={handlePointerDown}
         onPointerMove={handlePointerMove}
         onPointerUp={handlePointerUp}
         onDoubleClick={handleDoubleClick}
         style={{ cursor: "move", touchAction: "none" }}
      >
         <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={8}
            fill="var(--background)"
            stroke={color?.border ?? "currentColor"}
            strokeWidth={color ? 2 : 1}
            className={color ? undefined : "text-foreground/50"}
         />
         {hasIcon && iconName && (
            <NodeIcon
               name={iconName}
               x={node.x + NODE_PADDING_X_HALF(node)}
               y={iconY}
               size={ICON_SIZE}
               color={color?.accent}
            />
         )}
         <text
            x={hasIcon ? textCenterX : contentCenterX}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fill="currentColor"
         >
            {node.lines.map((line, i) => {
               const startY =
                  node.y +
                  node.height / 2 -
                  blockHeight / 2 +
                  NODE_LINE_HEIGHT / 2;
               return (
                  <tspan
                     key={i}
                     x={hasIcon ? textCenterX : contentCenterX}
                     y={startY + i * NODE_LINE_HEIGHT}
                  >
                     {line}
                  </tspan>
               );
            })}
         </text>
      </g>
   );
}

// Icon sits at a fixed inset from the node's left edge, vertically
// centered — simpler and more robust than trying to perfectly center
// icon+text as one measured unit.
function NODE_PADDING_X_HALF(node: LaidOutNode): number {
   return 12;
}

interface EdgeViewProps {
   edge: LaidOutEdge;
   isDynamic: boolean;
   sourceNode?: LaidOutNode;
   targetNode?: LaidOutNode;
}

function EdgeView({ edge, isDynamic, sourceNode, targetNode }: EdgeViewProps) {
   const points =
      isDynamic && sourceNode && targetNode
         ? straightEdgePath(sourceNode, targetNode)
         : edge.points;

   if (points.length < 2) return null;

   const pathD = pointsToSmoothPath(points);
   const { x: midX, y: midY } = midpointOfPath(points);

   const labelWidth = edge.label
      ? measureTextWidth(edge.label, EDGE_LABEL_FONT) + EDGE_LABEL_PADDING_X * 2
      : 0;
   const labelHeight = EDGE_LABEL_FONT_SIZE + EDGE_LABEL_PADDING_Y * 2;

   return (
      <g>
         <path
            d={pathD}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-foreground/60"
            markerEnd="url(#arrowhead)"
         />
         {edge.label && (
            <g>
               <rect
                  x={midX - labelWidth / 2}
                  y={midY - labelHeight / 2}
                  width={labelWidth}
                  height={labelHeight}
                  fill="var(--background)"
                  className="opacity-90"
               />
               <text
                  x={midX}
                  y={midY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={EDGE_LABEL_FONT_SIZE}
                  fill="currentColor"
                  className="text-foreground/60"
               >
                  {edge.label}
               </text>
            </g>
         )}
      </g>
   );
}

function pointsToSmoothPath(points: { x: number; y: number }[]): string {
   if (points.length === 2) {
      return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
   }
   let d = `M${points[0].x},${points[0].y}`;
   for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      d += ` Q${curr.x},${curr.y} ${midX},${midY}`;
   }
   const last = points[points.length - 1];
   d += ` L${last.x},${last.y}`;
   return d;
}
