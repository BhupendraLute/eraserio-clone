'use client';

import type { WhiteboardElement, ArrowElement, LineElement, CloudIconKind, LineStyle, ArrowheadStyle, Point, PortDirection } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS, LINE_DASH } from '@/lib/whiteboard/whiteboard-types';
import { ICON_CATALOG } from '@/lib/icons/icon-catalog';
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

  const renderCloudIconSvg = (kind: CloudIconKind | string, color: string) => {
    const matched = ICON_CATALOG.find((item) => item.kind === kind);
    if (matched && matched.icon) {
      const IconComponent = matched.icon;
      if (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent !== null && (IconComponent as unknown as { render?: unknown }).render)) {
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
    const waypoint = isCurved ? el.waypoint : undefined;
    const mid = getArrowMidpoint(el.startX, el.startY, el.endX, el.endY, waypoint);
    return (
      <>
        {/* Start Handle */}
        <circle cx={el.startX} cy={el.startY} r={6} fill="var(--canvas-accent)" stroke="var(--background)" strokeWidth={2}
          className="cursor-grab hover:scale-125 transition-transform" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          onPointerDown={(evt) => onEndpointPointerDown(evt, el.id, 'start', { x: el.startX, y: el.startY })} />
        {/* End Handle */}
        <circle cx={el.endX} cy={el.endY} r={6} fill="var(--canvas-accent)" stroke="var(--background)" strokeWidth={2}
          className="cursor-grab hover:scale-125 transition-transform" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          onPointerDown={(evt) => onEndpointPointerDown(evt, el.id, 'end', { x: el.endX, y: el.endY })} />
        {/* Waypoint / Middle Drag Handle (Only for curved arrows) */}
        {isCurved && (
          <g
            className="cursor-move group"
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
      </>
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
        <path d={pathD} fill="none" stroke="rgba(0,0,0,0.001)" strokeWidth={24} style={{ pointerEvents: 'stroke' }} className="cursor-pointer" />
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
        {isSelected && !isBeingDragged && renderConnectorHandles(el)}
      </g>
    );
  };

  return (
    <>
      {elements.map((el) => {
        const isSelected = selectedIds.includes(el.id);
        const dashArray = getStrokeDasharray(el);

        if (el.type === 'rectangle') {
          const cornerRad = el.cornerRadius ?? 6;
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={cornerRad}
                fill={el.fillColor ?? 'transparent'} stroke={el.strokeColor} strokeWidth={el.strokeWidth}
                strokeDasharray={dashArray} className="cursor-pointer" />
              {el.label && (
                <text x={el.x + el.width / 2} y={el.y + el.height / 2} textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none select-none" fill="currentColor" fontSize={13} fontWeight={500}>
                  {el.label}
                </text>
              )}
            </g>
          );
        }

        if (el.type === 'circle') {
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <ellipse cx={el.x + el.width / 2} cy={el.y + el.height / 2} rx={el.width / 2} ry={el.height / 2}
                fill={el.fillColor ?? 'transparent'} stroke={el.strokeColor} strokeWidth={el.strokeWidth}
                strokeDasharray={dashArray} className="cursor-pointer" />
              {el.label && (
                <text x={el.x + el.width / 2} y={el.y + el.height / 2} textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none select-none" fill="currentColor" fontSize={13} fontWeight={500}>
                  {el.label}
                </text>
              )}
            </g>
          );
        }

        if (el.type === 'diamond') {
          const cx = el.x + el.width / 2;
          const cy = el.y + el.height / 2;
          const points = `${cx},${el.y} ${el.x + el.width},${cy} ${cx},${el.y + el.height} ${el.x},${cy}`;
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <polygon points={points} fill={el.fillColor ?? 'transparent'} stroke={el.strokeColor}
                strokeWidth={el.strokeWidth} strokeDasharray={dashArray} className="cursor-pointer" />
              {el.label && (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none select-none" fill="currentColor" fontSize={13} fontWeight={500}>
                  {el.label}
                </text>
              )}
            </g>
          );
        }

        if (el.type === 'cylinder') {
          const rx = el.width / 2;
          const ry = Math.min(16, el.height / 4);
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y + ry} width={el.width} height={el.height - ry * 2}
                fill={el.fillColor ?? 'transparent'} stroke="none" strokeWidth={0} />
              <ellipse cx={el.x + rx} cy={el.y + ry} rx={rx} ry={ry}
                fill={el.fillColor ?? 'transparent'} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={dashArray} />
              <path d={`M ${el.x} ${el.y + ry} L ${el.x} ${el.y + el.height - ry}`}
                stroke={el.strokeColor} strokeWidth={el.strokeWidth} fill="none" />
              <path d={`M ${el.x + el.width} ${el.y + ry} L ${el.x + el.width} ${el.y + el.height - ry}`}
                stroke={el.strokeColor} strokeWidth={el.strokeWidth} fill="none" />
              <ellipse cx={el.x + rx} cy={el.y + el.height - ry} rx={rx} ry={ry}
                fill={el.fillColor ?? 'transparent'} stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeDasharray={dashArray} />
              {el.label && (
                <text x={el.x + rx} y={el.y + el.height / 2} textAnchor="middle" dominantBaseline="central"
                  className="pointer-events-none select-none" fill="currentColor" fontSize={13} fontWeight={500}>
                  {el.label}
                </text>
              )}
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

        if (el.type === 'sticky') {
          const style = WHITEBOARD_COLORS[el.color];
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={8}
                fill={style.bg} stroke={style.border} strokeWidth={2} className="cursor-pointer shadow-md" />
              {editingElementId !== el.id && (
                <foreignObject x={el.x + 8} y={el.y + 8} width={el.width - 16} height={el.height - 16}>
                  <textarea
                    value={el.text}
                    onChange={(evt) => updateElement(el.id, { text: evt.target.value })}
                    className="h-full w-full resize-none bg-transparent font-medium outline-none select-none"
                    style={{ color: style.text, fontSize: `${el.fontSize ?? 12}px`, fontFamily: el.fontFamily ?? 'inherit', fontWeight: el.fontWeight ?? 'normal', fontStyle: el.fontStyle ?? 'normal', textAlign: el.textAlign ?? 'center' }}
                  />
                </foreignObject>
              )}
            </g>
          );
        }

        if (el.type === 'pencil') {
          const strokePoints = (el as any).strokePoints as number[][] | undefined;
          if (strokePoints && strokePoints.length > 0) {
            const outlinePoints = strokePoints;
            if (outlinePoints.length > 0) {
              const pathData = outlinePoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ') + ' Z';
              return (
                <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
                  <path d={pathData} fill={el.strokeColor} stroke={el.strokeColor} strokeWidth={1} fillOpacity={0.8} className="cursor-pointer" />
                </g>
              );
            }
          }
          const pathData = el.points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <path d={pathData} fill="none" stroke={el.strokeColor} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer" />
            </g>
          );
        }

        if (el.type === 'text') {
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              {editingElementId !== el.id && (
                <foreignObject x={el.x} y={el.y} width={Math.max(140, el.width)} height={Math.max(40, el.height)}>
                  <input type="text" value={el.text}
                    onChange={(evt) => updateElement(el.id, { text: evt.target.value })}
                    className="h-full w-full bg-transparent font-semibold outline-none select-none"
                    style={{ color: el.strokeColor, fontSize: `${el.fontSize ?? 16}px`, fontFamily: el.fontFamily ?? 'inherit', fontWeight: el.fontWeight ?? 'bold', fontStyle: el.fontStyle ?? 'normal', textAlign: el.textAlign ?? 'left' }}
                  />
                </foreignObject>
              )}
            </g>
          );
        }

        if (el.type === 'cloud') {
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="transparent" stroke="transparent" strokeWidth={0} className="cursor-pointer" />
              <foreignObject x={el.x} y={el.y} width={el.width} height={el.height} className="pointer-events-none">
                <div className="flex h-full w-full items-center justify-center p-0.5 select-none pointer-events-none">
                  {renderCloudIconSvg(el.iconKind, el.strokeColor)}
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
                strokeWidth={el.strokeWidth} strokeDasharray={dashArray} className="cursor-pointer" />
              <foreignObject x={el.x + 8} y={el.y + 4} width={el.width - 16} height={24}>
                <span className="text-[11px] font-bold text-muted-foreground select-none pointer-events-none">{el.title}</span>
              </foreignObject>
            </g>
          );
        }

        if (el.type === 'diagram') {
          const diagramRecord = diagramMap[el.diagramId];
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={8}
                fill="var(--background)" stroke={isSelected ? 'var(--canvas-accent)' : 'var(--border)'}
                strokeWidth={isSelected ? 2 : 1} className="cursor-pointer shadow-sm" />
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
          const style = WHITEBOARD_COLORS[el.color];
          return (
            <g key={el.id} onPointerDown={(e) => onElementPointerDown(e, el)} onClick={(e) => onElementClick(e, el)} onDoubleClick={(e) => onElementDoubleClick(e, el)} onContextMenu={(e) => onElementContextMenu?.(e, el)}>
              <rect x={el.x} y={el.y} width={el.width} height={el.height} rx={8}
                fill={el.fillColor ?? style.bg} stroke={el.strokeColor ?? style.border}
                strokeWidth={isSelected ? 2 : 1} className="cursor-pointer shadow-sm"
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
