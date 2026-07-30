'use client';

import type { WhiteboardElement, ArrowElement, LineElement, CloudIconKind, LineStyle, ArrowheadStyle, Point, PortDirection } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS, LINE_DASH, isPolygonShapeType, computeTextElementSize, getElementBounds } from '@/lib/whiteboard/whiteboard-types';
import { HighlightedCode } from '@/lib/whiteboard/code-highlighter';
import { ICON_MAP } from '@/lib/icons/icon-catalog';
import { DiagramPreview } from '@/components/docs/DiagramPreview';
import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Server, MessageSquare, Check } from 'lucide-react';
import { cn, generateId } from '@/lib/utils';
import {
  getDirectionalOrthogonalPathD,
  getCurvedPathD,
  inferCardinalDirection,
  getArrowMidpoint,
} from '@/lib/whiteboard/orthogonal-routing';

interface WhiteboardElementsProps {
  elements: WhiteboardElement[];
  selectedIds: string[];
  endpointDragState: { arrowId: string; endpoint: 'start' | 'end' | 'waypoint'; currentPos: { x: number; y: number } } | null;
  editingElementId: string | null;
  onElementPointerDown: (e: React.PointerEvent, el: WhiteboardElement) => void;
  onElementClick: (e: React.MouseEvent, el: WhiteboardElement) => void;
  onElementDoubleClick: (e: React.MouseEvent, el: WhiteboardElement) => void;
  onEndpointPointerDown: (e: React.PointerEvent, arrowId: string, endpoint: 'start' | 'end' | 'waypoint', pos: { x: number; y: number }) => void;
  onElementContextMenu?: (e: React.MouseEvent, el: WhiteboardElement) => void;

}

export function getMarkerId(ahStyle: ArrowheadStyle | undefined, color?: string): string {
  const cSuffix = color ? `-${color.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  switch (ahStyle) {
    case 'triangle': return `url(#wb-arrowhead-triangle${cSuffix})`;
    case 'diamond': return `url(#wb-arrowhead-diamond${cSuffix})`;
    case 'circle': return `url(#wb-arrowhead-circle${cSuffix})`;
    case 'arrow': return `url(#wb-arrowhead${cSuffix})`;
    case 'none': return '';
    default: return `url(#wb-arrowhead${cSuffix})`;
  }
}

export function getStartMarkerId(ahStyle: ArrowheadStyle | undefined, color?: string): string {
  const cSuffix = color ? `-${color.replace(/[^a-zA-Z0-9]/g, '')}` : '';
  switch (ahStyle) {
    case 'triangle': return `url(#wb-arrowhead-start-triangle${cSuffix})`;
    case 'diamond': return `url(#wb-arrowhead-start-diamond${cSuffix})`;
    case 'circle': return `url(#wb-arrowhead-start-circle${cSuffix})`;
    case 'arrow': return `url(#wb-arrowhead-start${cSuffix})`;
    case 'none': return '';
    default: return '';
  }
}

export function WhiteboardElements({
  elements,
  selectedIds,
  endpointDragState,
  editingElementId,
  onElementPointerDown,
  onElementClick,
  onElementDoubleClick,
  onEndpointPointerDown,
  onElementContextMenu,

}: WhiteboardElementsProps) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const diagramMap = useDiagramRegistry((s) => s.diagrams);

  const renderCloudIconSvg = (kind: CloudIconKind | string, color: string, elementWidth: number = 64) => {
    const matched = ICON_MAP.get(kind);
    const IconComponent = (matched && matched.icon) ? matched.icon : Server;

    // Ultra-fine stroke scaling (1.15px baseline, max 1.8px)
    const computedStrokeWidth = Math.max(1.0, Math.min(1.8, 1.15 * Math.pow(Math.max(32, elementWidth) / 64, 0.25)));

    return (
      <div
        style={{ color }}
        className="flex h-full w-full items-center justify-center select-none pointer-events-none p-1 [&_svg]:max-h-full [&_svg]:max-w-full"
      >
        <IconComponent className="h-full w-full" strokeWidth={computedStrokeWidth} />
      </div>
    );
  };

  const getStrokeDasharray = (el: WhiteboardElement): string => {
    const ls = (el as { lineStyle?: LineStyle }).lineStyle;
    return ls ? LINE_DASH[ls] : '';
  };

  const renderLabel = (el: WhiteboardElement, label: string | undefined, midX: number, midY: number) => {
    if (!label || editingElementId === el.id) return null;
    const labelFontSize = (el as any).labelFontSize ?? (el as any).fontSize ?? 12;
    const labelFontFamily = (el as any).labelFontFamily ?? (el as any).fontFamily ?? 'inherit';
    const labelColor = (el as any).labelColor ?? el.strokeColor ?? 'currentColor';

    const charWidth = labelFontSize * 0.62;
    const paddingX = 8;
    const paddingY = 4;
    const rectWidth = Math.max(24, label.length * charWidth + paddingX * 2);
    const rectHeight = labelFontSize + paddingY * 2;
    const rectX = midX - rectWidth / 2;
    const rectY = midY - rectHeight / 2;

    return (
      <g className="pointer-events-none select-none">
        {/* Opaque pill background mask matching canvas background to hide path underneath */}
        <rect
          x={rectX}
          y={rectY}
          width={rectWidth}
          height={rectHeight}
          rx={4}
          fill="var(--background)"
        />
        <text
          x={midX}
          y={midY}
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
    );
  };

  const renderConnectorHandles = (el: ArrowElement | LineElement) => {
    const isCurved = el.routingStyle === 'curved';
    const isDraggingThis = endpointDragState?.arrowId === el.id;
    const draggingEndpoint = isDraggingThis ? endpointDragState?.endpoint : null;

    const startPos = isDraggingThis && draggingEndpoint === 'start' ? endpointDragState!.currentPos : { x: el.startX, y: el.startY };
    const endPos = isDraggingThis && draggingEndpoint === 'end' ? endpointDragState!.currentPos : { x: el.endX, y: el.endY };
    const waypointPos = isDraggingThis && draggingEndpoint === 'waypoint' ? endpointDragState!.currentPos : (isCurved ? el.waypoint : undefined);

    const mid = getArrowMidpoint(startPos.x, startPos.y, endPos.x, endPos.y, waypointPos);

    return (
      <g key={`handles-${el.id}`}>
        {/* Start Handle */}
        <circle cx={startPos.x} cy={startPos.y} r={6} fill="var(--canvas-accent)" stroke="var(--background)" strokeWidth={2}
          className={cn('transition-transform', isDraggingThis && draggingEndpoint === 'start' ? 'cursor-grabbing scale-125' : 'cursor-grab hover:scale-125')}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          onPointerDown={(evt) => onEndpointPointerDown(evt, el.id, 'start', startPos)} />
        {/* End Handle */}
        <circle cx={endPos.x} cy={endPos.y} r={6} fill="var(--canvas-accent)" stroke="var(--background)" strokeWidth={2}
          className={cn('transition-transform', isDraggingThis && draggingEndpoint === 'end' ? 'cursor-grabbing scale-125' : 'cursor-grab hover:scale-125')}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          onPointerDown={(evt) => onEndpointPointerDown(evt, el.id, 'end', endPos)} />
        {/* Waypoint / Middle Drag Handle (Only for curved arrows) */}
        {isCurved && (
          <g
            className={cn('group', isDraggingThis && draggingEndpoint === 'waypoint' ? 'cursor-grabbing' : 'cursor-grab')}
            onPointerDown={(evt) => {
              evt.stopPropagation();
              onEndpointPointerDown(evt, el.id, 'waypoint', mid);
            }}
            onDoubleClick={(evt) => {
              evt.stopPropagation();
              useWhiteboardStore.getState().updateElement(el.id, { waypoint: undefined });
            }}
          >
            <title>Drag to bend / Double-click to reset</title>
            <circle cx={mid.x} cy={mid.y} r={6} fill="var(--background)" stroke="var(--canvas-accent)" strokeWidth={2}
              className="hover:scale-125 transition-transform shadow-md" style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
            <circle cx={mid.x} cy={mid.y} r={2.5} fill="var(--canvas-accent)" />
          </g>
        )}
      </g>
    );
  };

  const renderConnector = (el: ArrowElement | LineElement, showArrowhead: boolean) => {
    const isBeingDragged = endpointDragState?.arrowId === el.id;
    const fromPort: PortDirection = el.fromElementId ? (el.fromPort || 'right') as PortDirection : inferCardinalDirection(el.startX, el.startY, el.endX, el.endY);
    const toPort: PortDirection = el.toElementId ? (el.toPort || 'left') as PortDirection : inferCardinalDirection(el.endX, el.endY, el.startX, el.startY);
    const dashArray = getStrokeDasharray(el);
    const isCurved = el.routingStyle === 'curved';
    const waypoint = isCurved ? el.waypoint : undefined;
    const mid = getArrowMidpoint(el.startX, el.startY, el.endX, el.endY, waypoint);

    const pathD = el.routingStyle === 'straight'
      ? `M ${el.startX} ${el.startY} L ${el.endX} ${el.endY}`
      : isCurved
        ? getCurvedPathD(el.startX, el.startY, el.endX, el.endY, waypoint)
        : getDirectionalOrthogonalPathD(el.startX, el.startY, el.endX, el.endY, fromPort, toPort);

    const markerEnd = showArrowhead ? getMarkerId((el as ArrowElement).arrowheadStyle, el.strokeColor) : '';
    const markerStart = showArrowhead ? getStartMarkerId((el as ArrowElement).startArrowheadStyle, el.strokeColor) : '';
    const arrowColor = el.strokeColor;

    const isSelected = selectedIds.includes(el.id);

    return (
      <g key={el.id}
        onPointerDown={(e) => onElementPointerDown(e, el)}
        onClick={(e) => onElementClick(e, el)}
        onDoubleClick={(e) => onElementDoubleClick(e, el)}
        onContextMenu={(e) => onElementContextMenu?.(e, el)}>
        {/* Invisible wide hit area */}
        <path d={pathD} fill="none" stroke="rgba(0,0,0,0.001)" strokeWidth={24} style={{ pointerEvents: (isHandMode || endpointDragState) ? 'none' : 'stroke' }} className={shapeCursorClass} />
        {/* Visible path */}
        {!isBeingDragged && (
          <path d={pathD} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth}
            strokeDasharray={dashArray} strokeLinecap="round" strokeLinejoin="round"
            markerEnd={markerEnd || undefined}
            markerStart={markerStart || undefined}
            className={cn('cursor-pointer pointer-events-none', el.isAnimated && 'animate-flow-dash')}
            style={(markerEnd || markerStart) ? { color: arrowColor } : undefined} />
        )}
        {el.label && !isBeingDragged && renderLabel(el, el.label, mid.x, mid.y)}
        {isSelected && renderConnectorHandles(el)}
      </g>
    );
  };

  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const isHandMode = activeTool === 'hand';
  const shapeCursorClass = isHandMode ? 'cursor-grab' : endpointDragState ? 'cursor-grabbing' : 'cursor-move';

  return (
    <>
      {elements.map((el) => {
        const isSelected = selectedIds.includes(el.id);
        const dashArray = getStrokeDasharray(el);

        if (isPolygonShapeType(el.type)) {
          const fillStyleMode = (el as any).fillStyle || 'plain';
          const strokeColor = el.strokeColor;
          const fillColor = el.fillColor ?? 'transparent';
          const strokeWidth = el.strokeWidth;
          const label = el.label;

          const fillOpacity = fillStyleMode === 'watercolor' ? 0.75 : 1.0;

          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;

          let shapeContent: React.ReactNode = null;

          if (el.type === 'rectangle' || el.type === 'square') {
            shapeContent = (
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={4}
                fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth}
                strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'circle') {
            shapeContent = (
              <ellipse cx={cx} cy={cy} rx={el.width / 2} ry={el.height / 2}
                fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth}
                strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'diamond') {
            const points = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
            shapeContent = (
              <polygon points={points} fill={fillColor} stroke={strokeColor}
                strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'triangle') {
            const points = `${cx},${el.y} ${el.x + el.width},${el.y + el.height} ${el.x},${el.y + el.height}`;
            shapeContent = (
              <polygon points={points} fill={fillColor} stroke={strokeColor}
                strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'parallelogram') {
            const w = el.width; const h = el.height;
            const points = `${el.x + w * 0.25},${el.y} ${el.x + w},${el.y} ${el.x + w * 0.75},${el.y + h} ${el.x},${el.y + h}`;
            shapeContent = (
              <polygon points={points} fill={fillColor} stroke={strokeColor}
                strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'trapezoid') {
            const w = el.width; const h = el.height;
            const points = `${el.x + w * 0.2},${el.y} ${el.x + w * 0.8},${el.y} ${el.x + w},${el.y + h} ${el.x},${el.y + h}`;
            shapeContent = (
              <polygon points={points} fill={fillColor} stroke={strokeColor}
                strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'cylinder') {
            const rx = el.width / 2;
            const ry = Math.min(16, el.height / 4);
            shapeContent = (
              <>
                <rect x={el.x} y={el.y + ry} width={el.width} height={el.height - ry * 2}
                  fill={fillColor} stroke="none" strokeWidth={0} fillOpacity={fillOpacity} />
                <ellipse cx={el.x + rx} cy={el.y + ry} rx={rx} ry={ry}
                  fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} />
                <path d={`M ${el.x} ${el.y + ry} L ${el.x} ${el.y + el.height - ry}`}
                  stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
                <path d={`M ${el.x + el.width} ${el.y + ry} L ${el.x + el.width} ${el.y + el.height - ry}`}
                  stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
                <ellipse cx={el.x + rx} cy={el.y + el.height - ry} rx={rx} ry={ry}
                  fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} />
              </>
            );
          } else if (el.type === 'capsule') {
            const rx = Math.min(el.width, el.height) / 2;
            shapeContent = (
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={rx}
                fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth}
                strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'hexagon') {
            const w = el.width; const h = el.height;
            const points = `${el.x + w * 0.25},${el.y} ${el.x + w * 0.75},${el.y} ${el.x + w},${cy} ${el.x + w * 0.75},${el.y + h} ${el.x + w * 0.25},${el.y + h} ${el.x},${cy}`;
            shapeContent = (
              <polygon points={points} fill={fillColor} stroke={strokeColor}
                strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          } else if (el.type === 'star') {
            const w = el.width; const h = el.height;
            const outerRx = w / 2; const outerRy = h / 2;
            const innerRx = w * 0.2; const innerRy = h * 0.2;
            const starPts: string[] = [];
            for (let i = 0; i < 10; i++) {
              const angle = (i * Math.PI) / 5 - Math.PI / 2;
              const rxVal = i % 2 === 0 ? outerRx : innerRx;
              const ryVal = i % 2 === 0 ? outerRy : innerRy;
              starPts.push(`${cx + rxVal * Math.cos(angle)},${cy + ryVal * Math.sin(angle)}`);
            }
            shapeContent = (
              <polygon points={starPts.join(' ')} fill={fillColor} stroke={strokeColor}
                strokeWidth={strokeWidth} strokeDasharray={dashArray} fillOpacity={fillOpacity} className={shapeCursorClass} />
            );
          }

          return (
            <g key={el.id}
              onPointerDown={(e) => onElementPointerDown(e, el)}
              onClick={(e) => onElementClick(e, el)}
              onDoubleClick={(e) => onElementDoubleClick(e, el)}
              onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              {shapeContent}
              {label && editingElementId !== el.id && (() => {
                const align = (el as any).textAlign ?? 'center';
                const fontSize = (el as any).labelFontSize ?? (el as any).fontSize ?? 14;
                const fontFamily = (el as any).labelFontFamily ?? (el as any).fontFamily ?? 'inherit';
                const labelColor = (el as any).labelColor ?? 'currentColor';

                const padX = 12;
                const padY = 8;

                return (
                  <foreignObject
                    x={el.x + padX}
                    y={el.y + padY}
                    width={Math.max(10, el.width - padX * 2)}
                    height={Math.max(10, el.height - padY * 2)}
                    className="pointer-events-none select-none overflow-hidden"
                  >
                    <div
                      className="h-full w-full flex flex-col justify-center transition-colors"
                      style={{
                        color: labelColor,
                        fontSize: `${fontSize}px`,
                        fontFamily,
                        textAlign: align,
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.35,
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </div>
                  </foreignObject>
                );
              })()}
            </g>
          );
        }

        if (el.type === 'arrow') {
          const arrowEl = el as ArrowElement;
          return renderConnector(arrowEl, true);
        }
        if (el.type === 'line') {
          const lineEl = el as LineElement;
          return renderConnector(lineEl, false);
        }

        if (el.type === 'pencil') {
          const isSelected = selectedIds.includes(el.id);
          const strokePoints = (el as any).strokePoints as number[][] | undefined;
          if (strokePoints && strokePoints.length > 0) {
            const outlinePoints = strokePoints;
            if (outlinePoints.length > 0) {
              const pathData = outlinePoints.map((pt: number[], i: number) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ') + ' Z';
              return (
                <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
                  {isSelected && (
                    <path d={pathData} fill="none" stroke="var(--canvas-accent)" strokeWidth={3} fillOpacity={0} opacity={0.6} className="pointer-events-none" />
                  )}
                  <path d={pathData} fill={el.strokeColor} stroke={el.strokeColor} strokeWidth={1} fillOpacity={0.8} className="cursor-move" />
                </g>
              );
            }
          }
          const pathData = el.points.map((pt: Point, i: number) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              {/* Invisible wider stroke for easy click/hover targeting without canvas blocking */}
              <path d={pathData} fill="none" stroke="transparent" strokeWidth={Math.max(16, el.strokeWidth + 10)} strokeLinecap="round" strokeLinejoin="round" className="cursor-move" />
              {/* Subtle stroke glow when selected (no container frame box) */}
              {isSelected && (
                <path d={pathData} fill="none" stroke="var(--canvas-accent)" strokeWidth={el.strokeWidth + 4} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} className="pointer-events-none" />
              )}
              {/* Main pencil stroke */}
              <path d={pathData} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="cursor-move" />
            </g>
          );
        }

        if (el.type === 'text') {
          const isCodeMode = el.mode === 'code';
          const fontSize = el.fontSize ?? (isCodeMode ? 16 : 24);
          const bounds = getElementBounds(el);

          return (
            <g
              key={el.id}
              onPointerDown={(e) => onElementPointerDown(e, el)}
              onClick={(e) => onElementClick(e, el)}
              onDoubleClick={(e) => onElementDoubleClick(e, el)}
              onContextMenu={(e) => onElementContextMenu?.(e, el)}
            >
              {editingElementId !== el.id && (
                <foreignObject x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} className="overflow-visible" onWheel={(e) => e.stopPropagation()}>
                  {isCodeMode ? (
                    <div
                      className={cn(
                        'flex h-full w-full flex-col rounded-xl border border-[#2e3040] bg-[#181920] px-4 py-3 shadow-xl backdrop-blur transition-all select-none cursor-move overflow-hidden',
                        isSelected && 'ring-2 ring-sky-500/70 ring-offset-1 ring-offset-background'
                      )}
                    >
                      <HighlightedCode code={el.text || 'print("Hello world");'} language={el.language} fontSize={fontSize} textWrap={el.textWrap ?? true} />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'h-full w-full flex items-center bg-transparent select-none cursor-move',
                        isSelected && 'ring-1 ring-primary/40 rounded'
                      )}
                      style={{
                        color: el.strokeColor || 'var(--foreground)',
                        fontSize: `${fontSize}px`,
                        fontFamily: el.fontFamily ?? 'inherit',
                        fontWeight: el.fontWeight ?? 'bold',
                        fontStyle: el.fontStyle ?? 'normal',
                        textAlign: el.textAlign ?? 'left',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {el.text || 'Double click to edit text'}
                    </div>
                  )}
                </foreignObject>
              )}
            </g>
          );
        }

        if (el.type === 'cloud') {
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="transparent" stroke="transparent" strokeWidth={0} className="cursor-move" />
              <foreignObject x={el.x} y={el.y} width={el.width} height={el.height} className="pointer-events-none">
                <div className="flex h-full w-full items-center justify-center p-0.5 select-none pointer-events-none">
                  {renderCloudIconSvg(el.iconKind, el.strokeColor, el.width)}
                </div>
              </foreignObject>
            </g>
          );
        }

        if (el.type === 'frame') {
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={4}
                fill={el.frameBg ?? 'var(--background)'} fillOpacity={0.5} stroke={el.frameColor ?? el.strokeColor}
                strokeWidth={el.strokeWidth} strokeDasharray={dashArray} className="cursor-move" />
              {editingElementId !== el.id && (
                <foreignObject x={el.x + 8} y={el.y + 4} width={el.width - 16} height={24}>
                  <span className="text-[11px] font-bold text-muted-foreground select-none pointer-events-none">{el.title}</span>
                </foreignObject>
              )}
            </g>
          );
        }

        if (el.type === 'diagram') {
          const diagramRecord = diagramMap[el.diagramId];
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={8}
                fill="var(--background)" stroke={isSelected ? 'var(--canvas-accent)' : 'var(--border)'}
                strokeWidth={isSelected ? 2 : 1} className="cursor-move shadow-sm" />
              <foreignObject x={el.x + 8} y={el.y + 8} width={el.width - 16} height={el.height - 16}>
                {diagramRecord ? (
                  <div className="h-full w-full overflow-hidden select-none pointer-events-none">
                    <div className="mb-1 text-[10px] font-semibold text-muted-foreground">{diagramRecord.name}</div>
                    <DiagramPreview source={diagramRecord.source} />
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground select-none pointer-events-none">Diagram not found</div>
                )}
              </foreignObject>
            </g>
          );
        }

        if (el.type === 'comment') {
          const style = WHITEBOARD_COLORS[el.color as keyof typeof WHITEBOARD_COLORS] ?? WHITEBOARD_COLORS.blue;
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={8}
                fill={el.fillColor ?? style.bg} stroke={el.strokeColor ?? style.border}
                strokeWidth={isSelected ? 2 : 1} className="cursor-move shadow-sm"
                strokeDasharray={el.resolved ? '4 4' : ''} opacity={el.resolved ? 0.6 : 1} />
              <foreignObject x={el.x} y={el.y} width={24} height={24}>
                <div className="flex h-full w-full items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5" style={{ color: style.border }} />
                </div>
              </foreignObject>
              <foreignObject x={el.x + 28} y={el.y + 4} width={el.width - 36} height={el.height - 8}>
                {editingElementId === el.id ? (
                  <textarea value={el.text} onChange={(evt) => updateElement(el.id, { text: evt.target.value })}
                    className="h-full w-full resize-none bg-transparent text-[11px] font-medium outline-none" style={{ color: style.text }} autoFocus />
                ) : (
                  <div className="text-[11px] font-medium" style={{ color: style.text }}>
                    {el.resolved ? <span className="line-through opacity-60">{el.text}</span> : el.text}
                    <div className="mt-1 text-[9px] opacity-50">{el.author}</div>
                  </div>
                )}
              </foreignObject>
              {isSelected && (
                <foreignObject x={el.x + el.width - 28} y={el.y + 4} width={24} height={24}>
                  <button onClick={(evt) => { evt.stopPropagation(); useWhiteboardStore.getState().toggleResolvedComment(el.id); }}
                    className="flex h-full w-full items-center justify-center rounded hover:bg-foreground/10"
                    title={el.resolved ? 'Unresolve' : 'Resolve'}>
                    <Check className="h-3 w-3" style={{ color: el.resolved ? '#22c55e' : style.border }} />
                  </button>
                </foreignObject>
              )}
            </g>
          );
        }

        return null;
      })}
    </>
  );
}
