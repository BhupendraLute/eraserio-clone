'use client';

import React from 'react';
import type {
  WhiteboardElement,
  ResizeHandle,
  Point,
  WhiteboardTool,
} from '@/lib/whiteboard/whiteboard-types';
import {
  getDirectionalOrthogonalPathD,
  inferCardinalDirection,
  ShapePortSnap,
} from '@/lib/whiteboard/orthogonal-routing';

interface WhiteboardOverlaysProps {
  activeTool: WhiteboardTool;
  drawingState: { start: Point; current: Point; points: Point[] } | null;
  quickConnectDragState: {
    sourceId: string;
    fromPort: 'top' | 'bottom' | 'left' | 'right';
    startPos: Point;
    currentPos: Point;
  } | null;
  activeSnap: ShapePortSnap | null;
  selectionBox: { start: Point; current: Point } | null;
  selectedElements: WhiteboardElement[];
  singleSelectedShape: WhiteboardElement | null;
  hoveredPort: { elementId: string; dir: 'top' | 'right' | 'bottom' | 'left' } | null;
  onResizeHandlePointerDown: (e: React.PointerEvent, handle: ResizeHandle, targetId: string) => void;
  onSpawnConnectedNode: (sourceId: string, dir: 'top' | 'right' | 'bottom' | 'left') => void;
  onQuickConnectDragStart: (e: React.PointerEvent, sourceId: string, fromPort: 'top' | 'right' | 'bottom' | 'left', pos: Point) => void;
  onPortHover: (port: { elementId: string; dir: 'top' | 'right' | 'bottom' | 'left' }) => void;
}

export function WhiteboardOverlays({
  activeTool,
  drawingState,
  quickConnectDragState,
  activeSnap,
  selectionBox,
  selectedElements,
  singleSelectedShape,
  hoveredPort,
  onResizeHandlePointerDown,
  onSpawnConnectedNode,
  onQuickConnectDragStart,
  onPortHover,
}: WhiteboardOverlaysProps) {
  return (
    <>
      {/* Live Active Drawing Preview */}
      {drawingState && (() => {
        const targetPt = activeSnap ? { x: activeSnap.x, y: activeSnap.y } : drawingState.current;
        const fromPort = inferCardinalDirection(drawingState.start.x, drawingState.start.y, targetPt.x, targetPt.y);
        const toPort = activeSnap ? activeSnap.port : inferCardinalDirection(targetPt.x, targetPt.y, drawingState.start.x, drawingState.start.y);

        return (
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
                  targetPt.x,
                  targetPt.y,
                  fromPort,
                  toPort
                )}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="4 4"
                markerEnd={activeTool === 'arrow' ? 'url(#wb-arrowhead)' : undefined}
              />
            )}
          </g>
        );
      })()}

      {/* Live Quick-Connect Drag Preview */}
      {quickConnectDragState && (() => {
        const targetPt = activeSnap ? { x: activeSnap.x, y: activeSnap.y } : quickConnectDragState.currentPos;
        const toPort = activeSnap ? activeSnap.port : inferCardinalDirection(targetPt.x, targetPt.y, quickConnectDragState.startPos.x, quickConnectDragState.startPos.y);

        return (
          <g>
            <path
              d={getDirectionalOrthogonalPathD(
                quickConnectDragState.startPos.x,
                quickConnectDragState.startPos.y,
                targetPt.x,
                targetPt.y,
                quickConnectDragState.fromPort,
                toPort
              )}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="4 4"
              markerEnd="url(#wb-arrowhead)"
            />
          </g>
        );
      })()}

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
              onPointerDown={(e) => onResizeHandlePointerDown(e, h.handle as ResizeHandle, el.id)}
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
                      onSpawnConnectedNode(singleSelectedShape.id, qc.dir);
                    }}
                    onPointerDown={(evt) => {
                      evt.stopPropagation();
                      onQuickConnectDragStart(evt, singleSelectedShape.id, qc.dir, {
                        x: qc.cx,
                        y: qc.cy,
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
                      onPortHover({ elementId: singleSelectedShape.id, dir: qc.dir })
                    }
                  />
                )}
              </g>
            );
          })}
        </g>
      )}
    </>
  );
}
