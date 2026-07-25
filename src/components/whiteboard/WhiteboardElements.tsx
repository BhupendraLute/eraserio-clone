'use client';

import React from 'react';
import type { WhiteboardElement, CloudIconKind } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { ICON_CATALOG } from '@/lib/icons/icon-catalog';
import { DiagramPreview } from '@/components/docs/DiagramPreview';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Server } from 'lucide-react';
import {
  getDirectionalOrthogonalPathD,
  inferCardinalDirection,
} from '@/lib/whiteboard/orthogonal-routing';

interface WhiteboardElementsProps {
  elements: WhiteboardElement[];
  selectedIds: string[];
  onElementPointerDown: (e: React.PointerEvent, el: WhiteboardElement) => void;
  onElementClick: (e: React.MouseEvent, el: WhiteboardElement) => void;
  onEndpointPointerDown: (e: React.PointerEvent, arrowId: string, endpoint: 'start' | 'end', pos: { x: number; y: number }) => void;
}

export function WhiteboardElements({
  elements,
  selectedIds,
  onElementPointerDown,
  onElementClick,
  onEndpointPointerDown,
}: WhiteboardElementsProps) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const diagrams = useWorkspaceStore((s) => s.diagrams);

  const renderCloudIconSvg = (kind: CloudIconKind | string, color: string) => {
    const matched = ICON_CATALOG.find((item) => item.kind === kind);
    if (matched && matched.icon) {
      const IconComponent = matched.icon;
      if (
        typeof IconComponent === 'function' ||
        (typeof IconComponent === 'object' && IconComponent !== null && (IconComponent as unknown as { render?: unknown }).render)
      ) {
        return (
          <div style={{ color }} className="flex h-full w-full items-center justify-center select-none pointer-events-none">
            <IconComponent className="h-full w-full max-h-full max-w-full" />
          </div>
        );
      }
    }
    return (
      <div style={{ color }} className="flex h-full w-full items-center justify-center select-none pointer-events-none">
        <Server className="h-full w-full max-h-full max-w-full" />
      </div>
    );
  };

  return (
    <>
      {elements.map((el) => {
        const isSelected = selectedIds.includes(el.id);

        if (el.type === 'rectangle') {
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
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
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
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
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
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
          const fromPort = el.fromElementId
            ? (el.fromPort || 'right')
            : inferCardinalDirection(el.startX, el.startY, el.endX, el.endY);
          const toPort = el.toElementId
            ? (el.toPort || 'left')
            : inferCardinalDirection(el.endX, el.endY, el.startX, el.startY);

          const pathD = isOrthogonal
            ? getDirectionalOrthogonalPathD(
                el.startX,
                el.startY,
                el.endX,
                el.endY,
                fromPort,
                toPort
              )
            : `M ${el.startX} ${el.startY} L ${el.endX} ${el.endY}`;

          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
              {/* Wide invisible hit-area path for easy pointer selection */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="cursor-pointer"
              />
              <path
                d={pathD}
                fill="none"
                stroke={el.strokeColor}
                strokeWidth={el.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd="url(#wb-arrowhead)"
                className="cursor-pointer pointer-events-none"
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
                    onPointerDown={(evt) =>
                      onEndpointPointerDown(evt, el.id, 'start', { x: el.startX, y: el.startY })
                    }
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
                    onPointerDown={(evt) =>
                      onEndpointPointerDown(evt, el.id, 'end', { x: el.endX, y: el.endY })
                    }
                  />
                </>
              )}
            </g>
          );
        }

        if (el.type === 'line') {
          const isOrthogonal = el.routingStyle !== 'straight';
          const fromPort = el.fromElementId
            ? (el.fromPort || 'right')
            : inferCardinalDirection(el.startX, el.startY, el.endX, el.endY);
          const toPort = el.toElementId
            ? (el.toPort || 'left')
            : inferCardinalDirection(el.endX, el.endY, el.startX, el.startY);

          const pathD = isOrthogonal
            ? getDirectionalOrthogonalPathD(
                el.startX,
                el.startY,
                el.endX,
                el.endY,
                fromPort,
                toPort
              )
            : `M ${el.startX} ${el.startY} L ${el.endX} ${el.endY}`;

          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
              {/* Wide invisible hit-area path for easy pointer selection */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="cursor-pointer"
              />
              <path
                d={pathD}
                fill="none"
                stroke={el.strokeColor}
                strokeWidth={el.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="cursor-pointer pointer-events-none"
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
                    onPointerDown={(evt) =>
                      onEndpointPointerDown(evt, el.id, 'start', { x: el.startX, y: el.startY })
                    }
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
                    onPointerDown={(evt) =>
                      onEndpointPointerDown(evt, el.id, 'end', { x: el.endX, y: el.endY })
                    }
                  />
                </>
              )}
            </g>
          );
        }

        if (el.type === 'sticky') {
          const style = WHITEBOARD_COLORS[el.color];
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
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
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
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
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
              <rect
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                fill="transparent"
                stroke="transparent"
                strokeWidth={0}
                className="cursor-pointer"
              />
              <foreignObject
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                className="pointer-events-none"
              >
                <div className="flex h-full w-full items-center justify-center p-0.5 select-none pointer-events-none">
                  {renderCloudIconSvg(el.iconKind, el.strokeColor)}
                </div>
              </foreignObject>
            </g>
          );
        }

        if (el.type === 'diagram') {
          const diagramRecord = diagrams.find((d) => d.id === el.diagramId);
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)}>
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
    </>
  );
}
