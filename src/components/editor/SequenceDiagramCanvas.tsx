"use client";

import { usePanZoom } from "@/lib/hooks/usePanZoom";
import { useDiagramStore } from "@/lib/store/diagram-store";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Maximize } from "lucide-react";
import { useEffect, useRef } from "react";

const ACTOR_BOX_HEIGHT = 40;
const ARROW_SIZE = 8;

export function SequenceDiagramCanvas() {
   const actors = useDiagramStore((s) => s.sequenceActors);
   const messages = useDiagramStore((s) => s.sequenceMessages);
   const height = useDiagramStore((s) => s.sequenceHeight);
   const { transform, svgRef, handlers, zoomIn, zoomOut, fitBounds } =
      usePanZoom();

   const width = useDiagramStore((s) => s.sequenceWidth);

   const hasAutoFitted = useRef(false);
   useEffect(() => {
      if (!hasAutoFitted.current && actors.length > 0) {
         fitBounds(width, height);
         hasAutoFitted.current = true;
      }
   }, [actors, width, height, fitBounds]);

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
                  id="seq-arrowhead"
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
               {actors.map((actor) => (
                  <line
                     key={`lifeline-${actor.id}`}
                     x1={actor.x}
                     y1={ACTOR_BOX_HEIGHT}
                     x2={actor.x}
                     y2={height}
                     stroke="currentColor"
                     strokeDasharray="4 4"
                     className="text-foreground/40"
                  />
               ))}

               {actors.map((actor) => (
                  <g key={actor.id}>
                     <rect
                        x={actor.x - actor.width / 2}
                        y={0}
                        width={actor.width}
                        height={ACTOR_BOX_HEIGHT}
                        rx={8}
                        fill="var(--background)"
                        stroke="currentColor"
                        className="text-foreground/50"
                     />
                     <text
                        x={actor.x}
                        y={ACTOR_BOX_HEIGHT / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={13}
                        fill="currentColor"
                     >
                        {actor.label}
                     </text>
                  </g>
               ))}

               {messages.map((msg, i) => {
                  const fromActor = actors.find((a) => a.id === msg.from);
                  const toActor = actors.find((a) => a.id === msg.to);
                  if (!fromActor || !toActor) return null;

                  const isSelf = fromActor.id === toActor.id;

                  if (isSelf) {
                     const loopWidth = 40;
                     const x = fromActor.x;
                     const d = `M${x},${msg.y} C${x + loopWidth},${msg.y} ${x + loopWidth},${msg.y + 24} ${x},${msg.y + 24}`;
                     return (
                        <g key={i}>
                           <path
                              d={d}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.5}
                              strokeDasharray={
                                 msg.arrowType === "async" ? "4 3" : undefined
                              }
                              className="text-foreground/60"
                              markerEnd="url(#seq-arrowhead)"
                           />
                           {msg.label && (
                              <text
                                 x={x + loopWidth + 6}
                                 y={msg.y + 12}
                                 fontSize={11}
                                 fill="currentColor"
                                 className="text-foreground/60"
                              >
                                 {msg.label}
                              </text>
                           )}
                        </g>
                     );
                  }

                  return (
                     <g key={i}>
                        <line
                           x1={fromActor.x}
                           y1={msg.y}
                           x2={toActor.x}
                           y2={msg.y}
                           stroke="currentColor"
                           strokeWidth={1.5}
                           strokeDasharray={
                              msg.arrowType === "async" ? "4 3" : undefined
                           }
                           className="text-foreground/60"
                           markerEnd="url(#seq-arrowhead)"
                        />
                        {msg.label && (
                           <text
                              x={(fromActor.x + toActor.x) / 2}
                              y={msg.y - 6}
                              textAnchor="middle"
                              fontSize={11}
                              fill="currentColor"
                              className="text-foreground/60"
                           >
                              {msg.label}
                           </text>
                        )}
                     </g>
                  );
               })}
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
               onClick={() => fitBounds(width, height)}
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
