'use client';

import React from 'react';
import type {
  WhiteboardElement,
  ResizeHandle,
  Point,
  WhiteboardTool,
  PortDirection,
} from '@/lib/whiteboard/whiteboard-types';
import {
  getDirectionalOrthogonalPathD,
  getCurvedPathD,
  inferCardinalDirection,
  getOppositePort,
  getArrowMidpoint,
  determineAutoRoutingStyle,
  ShapePortSnap,
} from '@/lib/whiteboard/orthogonal-routing';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { getMarkerId, getStartMarkerId } from '@/components/whiteboard/WhiteboardElements';

/* CSS variable helpers for theme-aware canvas chrome */
const BG = () => 'var(--background)' as const;

interface WhiteboardOverlaysProps {
  elements: WhiteboardElement[];
  activeTool: WhiteboardTool;
  drawingState: { start: Point; current: Point; points: Point[] } | null;
  endpointDragState: { arrowId: string; endpoint: 'start' | 'end' | 'waypoint'; currentPos: Point } | null;
  quickConnectDragState: {
    sourceId: string;
    fromPort: PortDirection;
    startPos: Point;
    currentPos: Point;
  } | null;
  activeSnap: ShapePortSnap | null;
  selectionBox: { start: Point; current: Point } | null;
  selectedElements: WhiteboardElement[];
  singleSelectedShape: WhiteboardElement | null;
  hoveredPort: { elementId: string; dir: 'top' | 'right' | 'bottom' | 'left' } | null;
  isDraggingShape?: boolean;
  onResizeHandlePointerDown: (e: React.PointerEvent, handle: ResizeHandle, targetId: string) => void;
  onSpawnConnectedNode: (sourceId: string, dir: PortDirection) => void;
  onQuickConnectDragStart: (e: React.PointerEvent, sourceId: string, fromPort: PortDirection, pos: Point) => void;
  onPortHover: (port: { elementId: string; dir: 'top' | 'right' | 'bottom' | 'left' }) => void;
}

export function WhiteboardOverlays({
  elements,
  activeTool,
  drawingState,
  endpointDragState,
  quickConnectDragState,
  activeSnap,
  selectionBox,
  selectedElements,
  singleSelectedShape,
  hoveredPort,
  isDraggingShape = false,
  onResizeHandlePointerDown,
  onSpawnConnectedNode,
  onQuickConnectDragStart,
  onPortHover,
}: WhiteboardOverlaysProps) {
  return (
    <>
      {/* Live Active Drawing Preview */}
      {drawingState && (() => {
        const { start, current, points } = drawingState;
        const targetPt = activeSnap ? { x: activeSnap.x, y: activeSnap.y } : current;
        const minX = Math.min(start.x, current.x);
        const minY = Math.min(start.y, current.y);
        const w = Math.abs(current.x - start.x);
        const h = Math.abs(current.y - start.y);
        const cx = (start.x + current.x) / 2;
        const cy = (start.y + current.y) / 2;
        const fromPort = inferCardinalDirection(start.x, start.y, targetPt.x, targetPt.y);
        const toPort = activeSnap ? activeSnap.port : inferCardinalDirection(targetPt.x, targetPt.y, start.x, start.y);

        return (
          <g className="pointer-events-none">
            {activeTool === 'rectangle' && w > 0 && h > 0 && (
              <rect x={minX} y={minY} width={w} height={h} rx={6}
                fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
            )}
            {activeTool === 'circle' && w > 0 && h > 0 && (
              <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2}
                fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
            )}
            {activeTool === 'diamond' && w > 0 && h > 0 && (
              <polygon
                points={`${cx},${minY} ${minX + w},${cy} ${cx},${minY + h} ${minX},${cy}`}
                fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
            )}
            {activeTool === 'cylinder' && w > 0 && h > 0 && (
              <g>
                <rect x={minX} y={minY + Math.min(16, h / 4)} width={w} height={h - Math.min(16, h / 4) * 2}
                  fill="none" stroke="none" />
                <ellipse cx={cx} cy={minY + Math.min(16, h / 4)} rx={w / 2} ry={Math.min(16, h / 4)}
                  fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
                <path d={`M ${minX} ${minY + Math.min(16, h / 4)} L ${minX} ${minY + h - Math.min(16, h / 4)}`}
                  stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
                <path d={`M ${minX + w} ${minY + Math.min(16, h / 4)} L ${minX + w} ${minY + h - Math.min(16, h / 4)}`}
                  stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
                <ellipse cx={cx} cy={minY + h - Math.min(16, h / 4)} rx={w / 2} ry={Math.min(16, h / 4)}
                  fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
              </g>
            )}
            {(activeTool === 'arrow' || activeTool === 'line') && (() => {
              const activeRS = useWhiteboardStore.getState().activeRoutingStyle;
              const activeStartAh = useWhiteboardStore.getState().activeStartArrowheadStyle;
              const activeEndAh = useWhiteboardStore.getState().activeArrowheadStyle;
              const activeStrokeHex = useWhiteboardStore.getState().activeStrokeHex;
              const liveRoutingStyle = activeRS === 'curved' ? 'curved' : determineAutoRoutingStyle(start, targetPt, fromPort, toPort);
              const pathD = liveRoutingStyle === 'straight'
                ? `M ${start.x} ${start.y} L ${targetPt.x} ${targetPt.y}`
                : liveRoutingStyle === 'curved'
                  ? getCurvedPathD(start.x, start.y, targetPt.x, targetPt.y)
                  : getDirectionalOrthogonalPathD(start.x, start.y, targetPt.x, targetPt.y, fromPort, toPort);
              return (
                <path
                  d={pathD}
                  fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4"
                  markerEnd={activeTool === 'arrow' ? (getMarkerId(activeEndAh, activeStrokeHex) || undefined) : undefined}
                  markerStart={activeTool === 'arrow' ? (getStartMarkerId(activeStartAh, activeStrokeHex) || undefined) : undefined} />
              );
            })()}
            {activeTool === 'pencil' && points.length > 0 && (
              <path
                d={points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')}
                fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
            )}
            {activeTool === 'sticky' && (
              <rect x={start.x} y={start.y} width={180} height={180} rx={8}
                fill="none" stroke="var(--canvas-accent)" strokeWidth={2} strokeDasharray="4 4" />
            )}
            {activeTool === 'text' && (
              <rect x={start.x} y={start.y} width={160} height={40} rx={4}
                fill="none" stroke="var(--canvas-accent)" strokeWidth={1.5} strokeDasharray="4 4" />
            )}
            {activeTool === 'comment' && (
              <rect x={start.x - 16} y={start.y - 16} width={200} height={80} rx={8}
                fill="none" stroke="var(--canvas-accent)" strokeWidth={1.5} strokeDasharray="4 4" />
            )}
          </g>
        );
      })()}

      {/* Live Quick-Connect Drag Preview */}
      {quickConnectDragState && (() => {
        const targetPt = activeSnap ? { x: activeSnap.x, y: activeSnap.y } : quickConnectDragState.currentPos;
        const toPort = activeSnap ? activeSnap.port : getOppositePort(quickConnectDragState.fromPort);
        const activeRS = useWhiteboardStore.getState().activeRoutingStyle;
        const activeStartAh = useWhiteboardStore.getState().activeStartArrowheadStyle;
        const activeEndAh = useWhiteboardStore.getState().activeArrowheadStyle;
        const activeStrokeHex = useWhiteboardStore.getState().activeStrokeHex;
        const liveRoutingStyle = activeRS === 'curved' ? 'curved' : determineAutoRoutingStyle(quickConnectDragState.startPos, targetPt, quickConnectDragState.fromPort, toPort);
        const pathD = liveRoutingStyle === 'straight'
          ? `M ${quickConnectDragState.startPos.x} ${quickConnectDragState.startPos.y} L ${targetPt.x} ${targetPt.y}`
          : liveRoutingStyle === 'curved'
            ? getCurvedPathD(quickConnectDragState.startPos.x, quickConnectDragState.startPos.y, targetPt.x, targetPt.y)
            : getDirectionalOrthogonalPathD(
                quickConnectDragState.startPos.x,
                quickConnectDragState.startPos.y,
                targetPt.x,
                targetPt.y,
                quickConnectDragState.fromPort,
                toPort
              );

        return (
          <g>
            <path
              d={pathD}
              fill="none"
              stroke="var(--canvas-accent)"
              strokeWidth={2}
              strokeDasharray="4 4"
              markerEnd={getMarkerId(activeEndAh, activeStrokeHex) || undefined}
              markerStart={getStartMarkerId(activeStartAh, activeStrokeHex) || undefined}
            />
          </g>
        );
      })()}

      {/* Live Endpoint Dragging Preview */}
      {endpointDragState && (() => {
        const arrow = elements.find((el) => el.id === endpointDragState.arrowId);
        if (!arrow || (arrow.type !== 'arrow' && arrow.type !== 'line')) return null;

        const isStart = endpointDragState.endpoint === 'start';
        const isWaypoint = endpointDragState.endpoint === 'waypoint';
        const startPt = isStart
          ? (activeSnap ? { x: activeSnap.x, y: activeSnap.y } : endpointDragState.currentPos)
          : { x: arrow.startX, y: arrow.startY };

        const endPt = !isStart && !isWaypoint
          ? (activeSnap ? { x: activeSnap.x, y: activeSnap.y } : endpointDragState.currentPos)
          : { x: arrow.endX, y: arrow.endY };

        const waypointPt = isWaypoint ? endpointDragState.currentPos : arrow.waypoint;

        const fromPort = isStart
          ? (activeSnap ? activeSnap.port : inferCardinalDirection(startPt.x, startPt.y, endPt.x, endPt.y))
          : (arrow.fromElementId ? (arrow.fromPort || 'right') : inferCardinalDirection(startPt.x, startPt.y, endPt.x, endPt.y));

        const toPort = !isStart && !isWaypoint
          ? (activeSnap ? activeSnap.port : inferCardinalDirection(endPt.x, endPt.y, startPt.x, startPt.y))
          : (arrow.toElementId ? (arrow.toPort || 'left') : inferCardinalDirection(endPt.x, endPt.y, startPt.x, startPt.y));

        const liveRoutingStyle = (arrow.isUserRoutingStyle || arrow.routingStyle === 'curved')
          ? arrow.routingStyle
          : determineAutoRoutingStyle(startPt, endPt, fromPort, toPort);

        const pathD = liveRoutingStyle === 'straight'
          ? (waypointPt ? `M ${startPt.x} ${startPt.y} L ${waypointPt.x} ${waypointPt.y} L ${endPt.x} ${endPt.y}` : `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`)
          : liveRoutingStyle === 'curved'
            ? getCurvedPathD(startPt.x, startPt.y, endPt.x, endPt.y, waypointPt)
            : getDirectionalOrthogonalPathD(
                startPt.x,
                startPt.y,
                endPt.x,
                endPt.y,
                fromPort,
                toPort,
                12,
                24,
                waypointPt
              );

        const isCurved = arrow.routingStyle === 'curved';
        const liveWaypoint = isCurved ? waypointPt : undefined;
        const liveMid = getArrowMidpoint(startPt.x, startPt.y, endPt.x, endPt.y, liveWaypoint);

        const label = (arrow as any).label;
        const labelFontSize = (arrow as any).labelFontSize ?? (arrow as any).fontSize ?? 12;
        const labelFontFamily = (arrow as any).labelFontFamily ?? (arrow as any).fontFamily ?? 'inherit';
        const labelColor = (arrow as any).labelColor ?? (arrow as any).strokeColor ?? 'currentColor';

        const charWidth = labelFontSize * 0.62;
        const paddingX = 8;
        const paddingY = 4;
        const rectWidth = label ? Math.max(24, label.length * charWidth + paddingX * 2) : 0;
        const rectHeight = labelFontSize + paddingY * 2;
        const rectX = liveMid.x - rectWidth / 2;
        const rectY = liveMid.y - rectHeight / 2;

        return (
          <g className="pointer-events-none">
            <path
              d={pathD}
              fill="none"
              stroke={arrow.strokeColor || "var(--canvas-accent)"}
              strokeWidth={2}
              strokeDasharray="4 4"
              markerEnd={arrow.type === 'arrow' ? (getMarkerId((arrow as any).arrowheadStyle, arrow.strokeColor) || undefined) : undefined}
              markerStart={arrow.type === 'arrow' ? (getStartMarkerId((arrow as any).startArrowheadStyle, arrow.strokeColor) || undefined) : undefined}
            />
            {label && (
              <g className="pointer-events-none select-none">
                <rect
                  x={rectX}
                  y={rectY}
                  width={rectWidth}
                  height={rectHeight}
                  rx={4}
                  fill="var(--background)"
                />
                <text
                  x={liveMid.x}
                  y={liveMid.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-medium"
                  fill={labelColor}
                  fontSize={labelFontSize}
                  fontFamily={labelFontFamily}
                >
                  {label}
                </text>
              </g>
            )}
          </g>
        );
      })()}

      {/* Dynamic Snap Ring Indicator */}
      {activeSnap && (
        <g key="active-snap-ring" className="pointer-events-none">
          <circle
            cx={activeSnap.x}
            cy={activeSnap.y}
            r={8}
            fill="var(--canvas-accent)"
            fillOpacity={0.2}
            stroke="var(--canvas-accent)"
            strokeWidth={2}
          />
          <circle cx={activeSnap.x} cy={activeSnap.y} r={4} fill="var(--canvas-accent)" />
        </g>
      )}

      {/* Multi-element Drag Rect Selection Box */}
      {selectionBox && (
        <rect
          x={Math.min(selectionBox.start.x, selectionBox.current.x)}
          y={Math.min(selectionBox.start.y, selectionBox.current.y)}
          width={Math.abs(selectionBox.current.x - selectionBox.start.x)}
          height={Math.abs(selectionBox.current.y - selectionBox.start.y)}
          fill="var(--canvas-accent)"
          fillOpacity={0.08}
          stroke="var(--canvas-accent)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}

      {/* Selection Bounding Box & 8 Resize Handles (Shapes only — removed for arrows/lines) */}
      {selectedElements
        .filter((el) => !['arrow', 'line', 'pencil'].includes(el.type))
        .map((el) => (
          <g key={`select-box-${el.id}`}>
          <rect
            x={el.x - 2}
            y={el.y - 2}
            width={el.width + 4}
            height={el.height + 4}
            fill="none"
            stroke="var(--canvas-accent)"
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
              fill="var(--background)"
              stroke="var(--canvas-accent)"
              strokeWidth={1.5}
              className="cursor-nwse-resize"
              onPointerDown={(e) => onResizeHandlePointerDown(e, h.handle as ResizeHandle, el.id)}
            />
          ))}
        </g>
      ))}

      {/* Eraser.io Dynamic Side-Hover Quick-Connect Flow Handles (+) */}
      {!isDraggingShape && singleSelectedShape && (
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
                      fill="var(--canvas-accent)"
                      className="transition-all duration-150 scale-110 shadow-lg"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                    />
                    <path
                      d={`M ${qc.cx - 4} ${qc.cy} L ${qc.cx + 4} ${qc.cy} M ${qc.cx} ${qc.cy - 4} L ${qc.cx} ${qc.cy + 4}`}
                      stroke="var(--background)"
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
                    stroke="var(--canvas-accent)"
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
