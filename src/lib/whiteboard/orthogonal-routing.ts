import type { WhiteboardElement, PortDirection, PortPosition } from './whiteboard-types';
import { getShapePorts, isConnectorElement } from './whiteboard-types';

export interface ShapePortSnap {
  elementId: string;
  port: PortDirection;
  x: number;
  y: number;
}

/**
 * Infers the optimal cardinal port direction (right, left, bottom, top) between two points
 * when an arrow endpoint is unattached/detached from a shape.
 */
export function inferCardinalDirection(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): PortDirection {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  } else {
    return dy >= 0 ? 'bottom' : 'top';
  }
}

export function getOppositePort(port: PortDirection): PortDirection {
  switch (port) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

/**
 * Calculates Eraser.io directional orthogonal elbow connector paths with clearance stubs and smooth arc bends.
 */
export function getDirectionalOrthogonalPathD(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromPort: PortDirection = 'bottom',
  toPort: PortDirection = 'top',
  cornerRadius: number = 12,
  stubLength: number = 24
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (Math.hypot(dx, dy) < 5) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Stub 1 (extending outwards from start port)
  let s1x = x1;
  let s1y = y1;
  if (fromPort === 'right') s1x += stubLength;
  else if (fromPort === 'left') s1x -= stubLength;
  else if (fromPort === 'bottom') s1y += stubLength;
  else if (fromPort === 'top') s1y -= stubLength;

  // Stub 2 (extending outwards from end port)
  let s2x = x2;
  let s2y = y2;
  if (toPort === 'right') s2x += stubLength;
  else if (toPort === 'left') s2x -= stubLength;
  else if (toPort === 'bottom') s2y += stubLength;
  else if (toPort === 'top') s2y -= stubLength;

  const isFromHorizontal = fromPort === 'left' || fromPort === 'right';
  const isToHorizontal = toPort === 'left' || toPort === 'right';

  const parts: string[] = [`M ${x1} ${y1}`, `L ${s1x} ${s1y}`];

  // Case 1: Both ports horizontal
  if (isFromHorizontal && isToHorizontal) {
    const midX = s1x + (s2x - s1x) / 2;
    const sY = s2y >= s1y ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(midX - s1x), Math.abs(s2y - s1y) / 2);

    if (r > 2 && Math.abs(s2y - s1y) > 4) {
      const sX1 = s1x < s2x ? 1 : -1;
      parts.push(
        `L ${midX - r * sX1} ${s1y}`,
        `Q ${midX} ${s1y}, ${midX} ${s1y + r * sY}`,
        `L ${midX} ${s2y - r * sY}`,
        `Q ${midX} ${s2y}, ${midX + r * sX1} ${s2y}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${midX} ${s1y}`, `L ${midX} ${s2y}`, `L ${s2x} ${s2y}`);
    }
  }
  // Case 2: Both ports vertical
  else if (!isFromHorizontal && !isToHorizontal) {
    const midY = s1y + (s2y - s1y) / 2;
    const sX = s2x >= s1x ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(midY - s1y), Math.abs(s2x - s1x) / 2);

    if (r > 2 && Math.abs(s2x - s1x) > 4) {
      const sY1 = s1y < s2y ? 1 : -1;
      parts.push(
        `L ${s1x} ${midY - r * sY1}`,
        `Q ${s1x} ${midY}, ${s1x + r * sX} ${midY}`,
        `L ${s2x - r * sX} ${midY}`,
        `Q ${s2x} ${midY}, ${s2x} ${midY + r * sY1}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${s1x} ${midY}`, `L ${s2x} ${midY}`, `L ${s2x} ${s2y}`);
    }
  }
  // Case 3: One horizontal, one vertical
  else if (isFromHorizontal && !isToHorizontal) {
    const cornerX = s2x;
    const cornerY = s1y;
    const sX = cornerX >= s1x ? 1 : -1;
    const sY = s2y >= cornerY ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(cornerX - s1x), Math.abs(s2y - cornerY));

    if (r > 2) {
      parts.push(
        `L ${cornerX - r * sX} ${cornerY}`,
        `Q ${cornerX} ${cornerY}, ${cornerX} ${cornerY + r * sY}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${cornerX} ${cornerY}`, `L ${s2x} ${s2y}`);
    }
  }
  // Case 4: One vertical, one horizontal
  else {
    const cornerX = s1x;
    const cornerY = s2y;
    const sY = cornerY >= s1y ? 1 : -1;
    const sX = s2x >= cornerX ? 1 : -1;
    const r = Math.min(cornerRadius, Math.abs(cornerY - s1y), Math.abs(s2x - cornerX));

    if (r > 2) {
      parts.push(
        `L ${cornerX} ${cornerY - r * sY}`,
        `Q ${cornerX} ${cornerY}, ${cornerX + r * sX} ${cornerY}`,
        `L ${s2x} ${s2y}`
      );
    } else {
      parts.push(`L ${cornerX} ${cornerY}`, `L ${s2x} ${s2y}`);
    }
  }

  parts.push(`L ${x2} ${y2}`);
  return parts.join(' ');
}

export function getOptimalPortPair(fromEl: WhiteboardElement, toEl: WhiteboardElement) {
  const portsA = getShapePorts(fromEl);
  const portsB = getShapePorts(toEl);

  let bestPair = {
    fromPort: portsA[1].port,
    fromPos: { x: portsA[1].x, y: portsA[1].y },
    toPort: portsB[0].port,
    toPos: { x: portsB[0].x, y: portsB[0].y },
    minDist: Infinity,
  };

  portsA.forEach((pA) => {
    portsB.forEach((pB) => {
      const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      if (dist < bestPair.minDist) {
        bestPair = {
          fromPort: pA.port,
          fromPos: { x: pA.x, y: pA.y },
          toPort: pB.port,
          toPos: { x: pB.x, y: pB.y },
          minDist: dist,
        };
      }
    });
  });

  return bestPair;
}

export function getOptimalSinglePort(
  el: WhiteboardElement,
  pt: { x: number; y: number }
): PortPosition {
  const ports = getShapePorts(el);

  let best = ports[0];
  let minDist = Infinity;

  ports.forEach((p) => {
    const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
    if (dist < minDist) {
      minDist = dist;
      best = p;
    }
  });

  return best;
}

export function findNearestShapePort(
  pt: { x: number; y: number },
  elements: WhiteboardElement[],
  ignoreElementId?: string
): ShapePortSnap | null {
  let closest: ShapePortSnap | null = null;
  let minDistance = 60;

  elements.forEach((el) => {
    if (el.id === ignoreElementId) return;
    if (isConnectorElement(el) || el.type === 'pencil') return;

    const ports = getShapePorts(el);

    ports.forEach((p) => {
      const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = { elementId: el.id, port: p.port, x: p.x, y: p.y };
      }
    });

    // Check if cursor point is inside or near shape bounding box (16px threshold)
    const isInsideShape =
      pt.x >= el.x - 16 &&
      pt.x <= el.x + el.width + 16 &&
      pt.y >= el.y - 16 &&
      pt.y <= el.y + el.height + 16;

    if (isInsideShape) {
      const optimal = getOptimalSinglePort(el, pt);
      const distToOptimal = Math.hypot(pt.x - optimal.x, pt.y - optimal.y);
      if (distToOptimal < minDistance || !closest) {
        minDistance = distToOptimal;
        closest = { elementId: el.id, port: optimal.port, x: optimal.x, y: optimal.y };
      }
    }
  });

  return closest;
}

export { getElementBounds } from './whiteboard-types';
export { generateId } from '@/lib/utils';
