import { runPipelineSync } from '@/lib/dsl/run-pipeline-sync';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';
import { generateId } from '@/lib/utils';
import { searchIconsDynamic } from '@/lib/icons/icon-catalog';

export interface ConvertOptions {
  originX?: number;
  originY?: number;
}

const COLOR_HEX_MAP: Record<string, { stroke: string; fill: string }> = {
  blue: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.12)' },
  green: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.12)' },
  amber: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.12)' },
  orange: { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.12)' },
  purple: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.12)' },
  rose: { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.12)' },
  gray: { stroke: '#6b7280', fill: 'rgba(107, 114, 128, 0.12)' },
};

/**
 * Converts Eraser Diagram DSL source string into an array of native freeform
 * `WhiteboardElement` objects ready to be placed on the Whiteboard Canvas.
 */
export function convertDslToWhiteboardElements(
  dsl: string,
  options: ConvertOptions = {}
): WhiteboardElement[] {
  if (!dsl || !dsl.trim()) return [];

  const res = runPipelineSync(dsl);
  if (!res.ok) return [];

  const targetOriginX = options.originX ?? 100;
  const targetOriginY = options.originY ?? 100;

  if (res.kind === 'flowchart') {
    const { nodes, edges } = res;
    if (nodes.length === 0) return [];

    // Calculate layout bounds to translate coordinates to origin
    let minX = Infinity;
    let minY = Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
    });

    if (!isFinite(minX)) minX = 0;
    if (!isFinite(minY)) minY = 0;

    const dx = targetOriginX - minX;
    const dy = targetOriginY - minY;

    // Create a mapping from DSL node ID -> generated WhiteboardElement ID
    const nodeIdMap = new Map<string, string>();

    const elements: WhiteboardElement[] = [];

    // 1. Convert Nodes
    nodes.forEach((n) => {
      const elId = generateId();
      nodeIdMap.set(n.id, elId);

      const colorKey = (n.attrs.color || 'blue').toLowerCase();
      const colors = COLOR_HEX_MAP[colorKey] || COLOR_HEX_MAP.blue;
      const strokeColor = colors.stroke;
      const fillColor = colors.fill;

      const shapeAttr = (n.attrs.shape || 'rectangle').toLowerCase();
      const iconAttr = n.attrs.icon;

      const posX = n.x + dx;
      const posY = n.y + dy;
      const width = Math.max(60, n.width);
      const height = Math.max(40, n.height);

      if (iconAttr) {
        // Search icon catalog for matching tech / cloud icon
        const found = searchIconsDynamic(iconAttr, 5);
        const iconKind = found[0]?.kind || `iconify-sys-${iconAttr}`;

        elements.push({
          id: elId,
          type: 'cloud',
          x: posX,
          y: posY,
          width: Math.max(56, Math.min(width, height)),
          height: Math.max(56, Math.min(width, height)),
          iconKind,
          label: n.label,
          strokeColor,
          fillColor,
          strokeWidth: 2,
        });
      } else if (
        [
          'circle',
          'diamond',
          'triangle',
          'parallelogram',
          'trapezoid',
          'cylinder',
          'capsule',
          'hexagon',
          'star',
        ].includes(shapeAttr)
      ) {
        elements.push({
          id: elId,
          type: shapeAttr as any,
          x: posX,
          y: posY,
          width,
          height,
          label: n.label,
          strokeColor,
          fillColor,
          strokeWidth: 2,
          lineStyle: 'solid',
          fillStyle: 'plain',
        });
      } else {
        // Default rectangle shape
        elements.push({
          id: elId,
          type: 'rectangle',
          x: posX,
          y: posY,
          width,
          height,
          label: n.label,
          strokeColor,
          fillColor,
          strokeWidth: 2,
          cornerRadius: 6,
          lineStyle: 'solid',
          fillStyle: 'plain',
        });
      }
    });

    // 2. Convert Edges (Connectors)
    edges.forEach((e) => {
      const fromElId = nodeIdMap.get(e.from);
      const toElId = nodeIdMap.get(e.to);
      const fromNode = nodes.find((n) => n.id === e.from);
      const toNode = nodes.find((n) => n.id === e.to);

      if (!fromNode || !toNode) return;

      const p0 = e.points && e.points[0] ? e.points[0] : { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height / 2 };
      const pLast = e.points && e.points.length > 0 ? e.points[e.points.length - 1] : { x: toNode.x + toNode.width / 2, y: toNode.y + toNode.height / 2 };

      const startX = p0.x + dx;
      const startY = p0.y + dy;
      const endX = pLast.x + dx;
      const endY = pLast.y + dy;

      elements.push({
        id: generateId(),
        type: 'arrow',
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.max(10, Math.abs(endX - startX)),
        height: Math.max(10, Math.abs(endY - startY)),
        startX,
        startY,
        endX,
        endY,
        fromElementId: fromElId,
        toElementId: toElId,
        label: e.label || undefined,
        routingStyle: 'orthogonal',
        arrowheadStyle: 'arrow',
        startArrowheadStyle: 'none',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
        lineStyle: 'solid',
      });
    });

    return elements;
  }

  if (res.kind === 'sequence') {
    const { actors, messages } = res;
    if (actors.length === 0) return [];

    const elements: WhiteboardElement[] = [];
    const actorIdMap = new Map<string, { topId: string; bottomId: string; x: number }>();

    const actorWidth = 140;
    const actorHeight = 44;
    const verticalGap = Math.max(300, res.height + 100);

    actors.forEach((act, idx) => {
      const topId = generateId();
      const bottomId = generateId();
      const posX = targetOriginX + act.x;
      const topY = targetOriginY + 40;
      const bottomY = topY + verticalGap;

      actorIdMap.set(act.id, { topId, bottomId, x: posX + actorWidth / 2 });

      // Top Actor Box
      elements.push({
        id: topId,
        type: 'rectangle',
        x: posX,
        y: topY,
        width: actorWidth,
        height: actorHeight,
        label: act.label,
        strokeColor: '#3b82f6',
        fillColor: 'rgba(59, 130, 246, 0.12)',
        strokeWidth: 2,
        cornerRadius: 6,
      });

      // Bottom Actor Box
      elements.push({
        id: bottomId,
        type: 'rectangle',
        x: posX,
        y: bottomY,
        width: actorWidth,
        height: actorHeight,
        label: act.label,
        strokeColor: '#3b82f6',
        fillColor: 'rgba(59, 130, 246, 0.12)',
        strokeWidth: 2,
        cornerRadius: 6,
      });

      // Lifeline (Line)
      elements.push({
        id: generateId(),
        type: 'line',
        x: posX + actorWidth / 2,
        y: topY + actorHeight,
        width: 2,
        height: verticalGap - actorHeight,
        startX: posX + actorWidth / 2,
        startY: topY + actorHeight,
        endX: posX + actorWidth / 2,
        endY: bottomY,
        fromElementId: topId,
        toElementId: bottomId,
        lineStyle: 'dashed',
        strokeColor: '#6b7280',
        strokeWidth: 1.5,
      });
    });

    // Sequence Messages
    const messageYGap = Math.max(40, (verticalGap - 60) / Math.max(1, messages.length + 1));
    messages.forEach((msg, idx) => {
      const fromActor = actorIdMap.get(msg.from);
      const toActor = actorIdMap.get(msg.to);
      if (!fromActor || !toActor) return;

      const msgY = targetOriginY + 40 + actorHeight + 30 + idx * messageYGap;

      elements.push({
        id: generateId(),
        type: 'arrow',
        x: Math.min(fromActor.x, toActor.x),
        y: msgY,
        width: Math.abs(toActor.x - fromActor.x),
        height: 10,
        startX: fromActor.x,
        startY: msgY,
        endX: toActor.x,
        endY: msgY,
        label: msg.label || undefined,
        routingStyle: 'straight',
        arrowheadStyle: 'arrow',
        startArrowheadStyle: 'none',
        lineStyle: msg.arrowType === 'async' ? 'dashed' : 'solid',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
      });
    });

    return elements;
  }

  return [];
}
