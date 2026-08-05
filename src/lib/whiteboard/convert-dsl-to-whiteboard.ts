import { runPipelineSync } from '@/lib/dsl/run-pipeline-sync';
import type { WhiteboardElement, FrameElement } from '@/lib/whiteboard/whiteboard-types';
import { generateId } from '@/lib/utils';
import { searchIconsDynamic } from '@/lib/icons/icon-catalog';
import { getOptimalPortPair } from '@/lib/whiteboard/orthogonal-routing';
import { measureTextWidth } from '@/lib/layout/text-measure';

export interface ConvertOptions {
  originX?: number;
  originY?: number;
}

const COLOR_HEX_MAP: Record<string, { stroke: string; fill: string }> = {
  blue: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.10)' },
  green: { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.10)' },
  amber: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.10)' },
  orange: { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.10)' },
  purple: { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.10)' },
  rose: { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.10)' },
  gray: { stroke: '#6b7280', fill: 'rgba(107, 114, 128, 0.10)' },
};

/**
 * Fuzzy icon resolution for System Design & Cloud Architecture components.
 */
function resolveIconKind(iconAttr?: string, label?: string): string {
  const target = (iconAttr || label || '').toLowerCase();

  if (target.includes('redis') || target.includes('cache')) return 'iconify-redis';
  if (target.includes('postgres') || target.includes('pg') || target.includes('sql')) return 'iconify-postgresql';
  if (target.includes('mongo')) return 'iconify-mongodb';
  if (target.includes('mysql')) return 'iconify-mysql';
  if (target.includes('db') || target.includes('database')) return 'iconify-sys-database';
  if (target.includes('user') || target.includes('client') || target.includes('browser')) return 'iconify-sys-devices';
  if (target.includes('gateway') || target.includes('api')) return 'iconify-aws-api-gateway';
  if (target.includes('auth') || target.includes('security') || target.includes('shield')) return 'iconify-sys-shield';
  if (target.includes('queue') || target.includes('sqs') || target.includes('rabbitmq')) return 'iconify-aws-sqs';
  if (target.includes('kafka') || target.includes('stream')) return 'iconify-kafka';
  if (target.includes('docker') || target.includes('container')) return 'iconify-docker';
  if (target.includes('k8s') || target.includes('kubernetes')) return 'iconify-kubernetes';
  if (target.includes('s3') || target.includes('storage') || target.includes('bucket')) return 'iconify-aws-s3';
  if (target.includes('lambda') || target.includes('function')) return 'iconify-aws-lambda';
  if (target.includes('server') || target.includes('host') || target.includes('node')) return 'iconify-sys-server';
  if (target.includes('cloud')) return 'iconify-sys-cloud';

  if (iconAttr) {
    const found = searchIconsDynamic(iconAttr, 3);
    if (found.length > 0) return found[0].kind;
  }

  return 'iconify-sys-box';
}

/**
 * Converts Eraser Diagram DSL source string into an array of native freeform
 * `WhiteboardElement` objects ready to be placed on the Whiteboard Canvas.
 */
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { getElementBounds } from '@/lib/whiteboard/whiteboard-types';

export function convertDslToWhiteboardElements(
  dsl: string,
  options: ConvertOptions = {}
): WhiteboardElement[] {
  if (!dsl || !dsl.trim()) return [];

  const res = runPipelineSync(dsl);
  if (!res.ok) return [];

  let targetOriginX = options.originX;
  let targetOriginY = options.originY;

  if (targetOriginX === undefined || targetOriginY === undefined) {
    const existing = useWhiteboardStore.getState().elements;
    if (existing.length === 0) {
      targetOriginX = 100;
      targetOriginY = 100;
    } else {
      let maxY = -Infinity;
      let minX = Infinity;
      existing.forEach((el) => {
        const b = getElementBounds(el);
        if (b.y + b.height > maxY) maxY = b.y + b.height;
        if (b.x < minX) minX = b.x;
      });

      targetOriginX = options.originX ?? (isFinite(minX) ? Math.max(80, minX) : 100);
      targetOriginY = options.originY ?? (isFinite(maxY) ? maxY + 140 : 100);
    }
  }

  if (res.kind === 'flowchart') {
    const { nodes, edges } = res;
    if (nodes.length === 0) return [];

    // Calculate layout bounds
    let minX = Infinity;
    let minY = Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
    });

    if (!isFinite(minX)) minX = 0;
    if (!isFinite(minY)) minY = 0;

    // Map DSL node ID -> generated WhiteboardElement ID
    const nodeIdMap = new Map<string, string>();
    const createdNodesMap = new Map<string, WhiteboardElement>();

    const elements: WhiteboardElement[] = [];

    // Apply generous scaling multipliers for maximum readability and zero overlap
    const scaleX = 1.3;
    const scaleY = 1.45;

    // Compute scaled positions & text-proportional dynamic dimensions for all nodes
    const positionedNodes = nodes.map((n) => {
      const labelText = n.label || n.id;
      const textWidth = measureTextWidth(labelText, '600 13px Inter, sans-serif');

      const isIcon = Boolean(n.attrs.icon || (n.attrs.shape || '').toLowerCase() === 'cloud');
      const iconPad = isIcon ? 36 : 0;
      const paddingX = 36;

      // Dynamic text-proportional width: scales cleanly with label text without overflow or over-stretching
      const width = Math.max(120, Math.min(320, Math.round(textWidth + iconPad + paddingX)));
      const height = Math.max(56, Math.round(n.height + 12));

      const posX = targetOriginX + (n.x - minX) * scaleX;
      const posY = targetOriginY + (n.y - minY) * scaleY;
      return { ...n, posX, posY, width, height };
    });

    // 1. Group nodes by color / tier category to build non-overlapping Tier Frames
    const tierMap = new Map<string, typeof positionedNodes>();
    positionedNodes.forEach((n) => {
      const colorKey = (n.attrs.color || 'blue').toLowerCase();
      const existing = tierMap.get(colorKey) || [];
      existing.push(n);
      tierMap.set(colorKey, existing);
    });

    // Generate tier enclosure frames
    tierMap.forEach((tierNodes, colorKey) => {
      if (tierNodes.length >= 2) {
        let tMinX = Infinity;
        let tMaxX = -Infinity;
        let tMinY = Infinity;
        let tMaxY = -Infinity;

        tierNodes.forEach((n) => {
          if (n.posX < tMinX) tMinX = n.posX;
          if (n.posX + n.width > tMaxX) tMaxX = n.posX + n.width;
          if (n.posY < tMinY) tMinY = n.posY;
          if (n.posY + n.height > tMaxY) tMaxY = n.posY + n.height;
        });

        let tierTitle = 'Architecture Tier';
        if (colorKey === 'blue') tierTitle = 'Client & Edge Tier';
        else if (colorKey === 'purple') tierTitle = 'Gateway & Security Tier';
        else if (colorKey === 'green') tierTitle = 'Microservices & Services Tier';
        else if (colorKey === 'amber' || colorKey === 'orange') tierTitle = 'Caching & Messaging Tier';
        else if (colorKey === 'rose') tierTitle = 'Data & Storage Tier';

        const paddingX = 32;
        const paddingY = 28;
        const colors = COLOR_HEX_MAP[colorKey] || COLOR_HEX_MAP.blue;

        const frameEl: FrameElement = {
          id: generateId(),
          type: 'frame',
          x: tMinX - paddingX,
          y: tMinY - paddingY - 18,
          width: Math.max(280, tMaxX - tMinX + paddingX * 2),
          height: Math.max(130, tMaxY - tMinY + paddingY * 2 + 18),
          title: tierTitle,
          strokeColor: colors.stroke,
          frameColor: colors.stroke,
          frameBg: 'rgba(255, 255, 255, 0.02)',
          strokeWidth: 1.5,
        };
        elements.push(frameEl);
      }
    });

    // 2. Convert Nodes into native Whiteboard shapes
    positionedNodes.forEach((n) => {
      const elId = generateId();
      nodeIdMap.set(n.id, elId);

      const colorKey = (n.attrs.color || 'blue').toLowerCase();
      const colors = COLOR_HEX_MAP[colorKey] || COLOR_HEX_MAP.blue;
      const strokeColor = colors.stroke;
      const fillColor = colors.fill;

      const shapeAttr = (n.attrs.shape || 'rectangle').toLowerCase();
      const iconAttr = n.attrs.icon;

      let createdEl: WhiteboardElement;

      if (iconAttr || shapeAttr === 'cloud') {
        const iconKind = resolveIconKind(iconAttr, n.label);
        createdEl = {
          id: elId,
          type: 'cloud',
          x: n.posX,
          y: n.posY,
          width: Math.max(80, Math.min(n.width, n.height)),
          height: Math.max(80, Math.min(n.width, n.height)),
          iconKind,
          label: n.label,
          strokeColor,
          fillColor,
          strokeWidth: 2,
        };
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
        createdEl = {
          id: elId,
          type: shapeAttr as any,
          x: n.posX,
          y: n.posY,
          width: n.width,
          height: n.height,
          label: n.label,
          strokeColor,
          fillColor,
          strokeWidth: 2,
          lineStyle: 'solid',
          fillStyle: 'plain',
        };
      } else {
        // High quality architecture service card
        createdEl = {
          id: elId,
          type: 'rectangle',
          x: n.posX,
          y: n.posY,
          width: n.width,
          height: n.height,
          label: n.label,
          strokeColor,
          fillColor,
          strokeWidth: 2,
          cornerRadius: 8,
          lineStyle: 'solid',
          fillStyle: 'plain',
        };
      }

      createdNodesMap.set(elId, createdEl);
      elements.push(createdEl);
    });

    // 3. Convert Edges (Connectors) using optimal cardinal port pairs
    edges.forEach((e) => {
      const fromElId = nodeIdMap.get(e.from);
      const toElId = nodeIdMap.get(e.to);
      const fromNodeEl = fromElId ? createdNodesMap.get(fromElId) : undefined;
      const toNodeEl = toElId ? createdNodesMap.get(toElId) : undefined;

      if (!fromNodeEl || !toNodeEl) return;

      const optimal = getOptimalPortPair(fromNodeEl, toNodeEl);

      const labelLower = (e.label || '').toLowerCase();
      const isAsync = labelLower.includes('event') || labelLower.includes('async') || labelLower.includes('publish') || labelLower.includes('queue') || labelLower.includes('kafka');
      const isDbReadWrite = labelLower.includes('read/write') || labelLower.includes('persist') || labelLower.includes('sql') || labelLower.includes('query') || labelLower.includes('db');
      const isCacheLookup = labelLower.includes('cache') || labelLower.includes('token') || labelLower.includes('validate') || labelLower.includes('session');

      let strokeColor = '#3b82f6';
      let lineStyle: 'solid' | 'dashed' = 'solid';
      let startArrowheadStyle: 'none' | 'arrow' = 'none';
      let arrowheadStyle: 'arrow' | 'none' = 'arrow';
      let isAnimated = false;

      if (isAsync) {
        strokeColor = '#f59e0b';
        lineStyle = 'dashed';
        isAnimated = true;
      } else if (isDbReadWrite) {
        strokeColor = '#f43f5e';
        if (labelLower.includes('read/write') || labelLower.includes('sync')) {
          startArrowheadStyle = 'arrow';
        }
      } else if (isCacheLookup) {
        strokeColor = '#a855f7';
        lineStyle = 'dashed';
      }

      elements.push({
        id: generateId(),
        type: 'arrow',
        x: Math.min(optimal.fromPos.x, optimal.toPos.x),
        y: Math.min(optimal.fromPos.y, optimal.toPos.y),
        width: Math.max(10, Math.abs(optimal.toPos.x - optimal.fromPos.x)),
        height: Math.max(10, Math.abs(optimal.toPos.y - optimal.fromPos.y)),
        startX: optimal.fromPos.x,
        startY: optimal.fromPos.y,
        endX: optimal.toPos.x,
        endY: optimal.toPos.y,
        fromElementId: fromElId,
        fromPort: optimal.fromPort,
        toElementId: toElId,
        toPort: optimal.toPort,
        label: e.label || undefined,
        routingStyle: 'orthogonal',
        arrowheadStyle,
        startArrowheadStyle,
        strokeColor,
        strokeWidth: 2,
        lineStyle,
        isAnimated,
      });
    });

    return elements;
  }

  if (res.kind === 'sequence') {
    const { actors, messages } = res;
    if (actors.length === 0) return [];

    const elements: WhiteboardElement[] = [];
    const actorIdMap = new Map<string, { topId: string; bottomId: string; x: number }>();

    const actorWidth = 160;
    const actorHeight = 48;
    const verticalGap = Math.max(380, res.height * 1.4 + 120);
    const actorScaleX = 1.35;

    actors.forEach((act) => {
      const topId = generateId();
      const bottomId = generateId();
      const posX = targetOriginX + act.x * actorScaleX;
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
        cornerRadius: 8,
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
        cornerRadius: 8,
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
    const messageYGap = Math.max(50, (verticalGap - 60) / Math.max(1, messages.length + 1));
    messages.forEach((msg, idx) => {
      const fromActor = actorIdMap.get(msg.from);
      const toActor = actorIdMap.get(msg.to);
      if (!fromActor || !toActor) return;

      const msgY = targetOriginY + 40 + actorHeight + 40 + idx * messageYGap;

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
        strokeColor: msg.arrowType === 'async' ? '#f59e0b' : '#3b82f6',
        strokeWidth: 2,
      });
    });

    return elements;
  }

  return [];
}
