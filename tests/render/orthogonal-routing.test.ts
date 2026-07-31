import { describe, expect, it } from 'vitest';
import {
  inferCardinalDirection,
  getOppositePort,
  getDirectionalOrthogonalPathD,
  getOptimalPortPair,
  getOptimalSinglePort,
  determineAutoRoutingStyle,
  findNearestShapePort,
  getCurvedPathD,
  getArrowMidpoint,
} from '@/lib/whiteboard/orthogonal-routing';
import type { ArrowElement, RectangleElement } from '@/lib/whiteboard/whiteboard-types';

function rect(id: string, x: number, y: number, width = 100, height = 60): RectangleElement {
  return {
    type: 'rectangle',
    id,
    x,
    y,
    width,
    height,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
  };
}

function arrow(id: string): ArrowElement {
  return {
    type: 'arrow',
    id,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    startX: 0,
    startY: 0,
    endX: 10,
    endY: 10,
    routingStyle: 'straight',
  };
}

describe('inferCardinalDirection', () => {
  it('infers horizontal direction from the dominant axis', () => {
    expect(inferCardinalDirection(0, 0, 10, 0)).toBe('right');
    expect(inferCardinalDirection(0, 0, -10, 0)).toBe('left');
  });

  it('infers vertical direction when the y axis dominates', () => {
    expect(inferCardinalDirection(0, 0, 0, 10)).toBe('bottom');
    expect(inferCardinalDirection(0, 0, 0, -10)).toBe('top');
  });

  it('breaks ties toward horizontal', () => {
    expect(inferCardinalDirection(0, 0, 10, 10)).toBe('right');
    expect(inferCardinalDirection(0, 0, -10, -10)).toBe('left');
  });
});

describe('getOppositePort', () => {
  it('mirrors every port direction', () => {
    expect(getOppositePort('top')).toBe('bottom');
    expect(getOppositePort('bottom')).toBe('top');
    expect(getOppositePort('left')).toBe('right');
    expect(getOppositePort('right')).toBe('left');
  });
});

describe('getDirectionalOrthogonalPathD', () => {
  it('emits a straight line for very short distances', () => {
    expect(getDirectionalOrthogonalPathD(0, 0, 2, 2)).toBe('M 0 0 L 2 2');
  });

  it('routes through the waypoint when provided', () => {
    expect(getDirectionalOrthogonalPathD(0, 0, 100, 100, 'bottom', 'top', 12, 24, { x: 50, y: 50 })).toBe(
      'M 0 0 L 50 0 L 50 50 L 100 50 L 100 100'
    );
  });

  it('builds a rounded elbow for opposite horizontal ports', () => {
    // stubs: (24,0) and (76,60); corner radius 12 around a vertical mid segment
    expect(getDirectionalOrthogonalPathD(0, 0, 100, 60, 'right', 'left', 12, 24)).toBe(
      'M 0 0 L 24 0 L 38 0 Q 50 0, 50 12 L 50 48 Q 50 60, 62 60 L 76 60 L 100 60'
    );
  });

  it('emits a plain zig-zag when aligned ports need no rounding', () => {
    expect(getDirectionalOrthogonalPathD(0, 0, 100, 0, 'right', 'left', 12, 24)).toBe(
      'M 0 0 L 24 0 L 50 0 L 50 0 L 76 0 L 100 0'
    );
  });

  it('builds the vertical zig-zag for opposite vertical ports', () => {
    expect(getDirectionalOrthogonalPathD(0, 0, 0, 100, 'top', 'bottom', 12, 24)).toBe(
      'M 0 0 L 0 -24 L 0 50 L 0 50 L 0 124 L 0 100'
    );
  });

  it('builds a single rounded corner for mixed ports', () => {
    expect(getDirectionalOrthogonalPathD(0, 0, 100, 60, 'right', 'bottom', 12, 24)).toBe(
      'M 0 0 L 24 0 L 88 0 Q 100 0, 100 12 L 100 84 L 100 60'
    );
    expect(getDirectionalOrthogonalPathD(0, 0, 100, 60, 'top', 'left', 12, 24)).toBe(
      'M 0 0 L 0 -24 L 0 48 Q 0 60, 12 60 L 76 60 L 100 60'
    );
  });
});

describe('getOptimalPortPair', () => {
  it('picks the closest port pair for side-by-side shapes (right -> left)', () => {
    const pair = getOptimalPortPair(rect('a', 0, 0), rect('b', 200, 0));
    expect(pair).toMatchObject({
      fromPort: 'right',
      fromPos: { x: 100, y: 30 },
      toPort: 'left',
      toPos: { x: 200, y: 30 },
    });
  });

  it('picks the closest port pair for stacked shapes (bottom -> top)', () => {
    const pair = getOptimalPortPair(rect('a', 0, 0), rect('b', 0, 200));
    expect(pair).toMatchObject({
      fromPort: 'bottom',
      fromPos: { x: 50, y: 60 },
      toPort: 'top',
      toPos: { x: 50, y: 200 },
    });
  });
});

describe('getOptimalSinglePort', () => {
  it('returns the port nearest to a free point', () => {
    expect(getOptimalSinglePort(rect('a', 0, 0), { x: 150, y: 30 })).toEqual({
      port: 'right',
      x: 100,
      y: 30,
    });
  });
});

describe('determineAutoRoutingStyle', () => {
  it('keeps aligned opposite horizontal ports straight', () => {
    expect(determineAutoRoutingStyle({ x: 0, y: 0 }, { x: 100, y: 0 }, 'right', 'left')).toBe(
      'straight'
    );
  });

  it('uses orthogonal routing when opposite horizontal ports are offset', () => {
    expect(determineAutoRoutingStyle({ x: 0, y: 0 }, { x: 100, y: 50 }, 'right', 'left')).toBe(
      'orthogonal'
    );
  });

  it('keeps aligned opposite vertical ports straight', () => {
    expect(determineAutoRoutingStyle({ x: 0, y: 0 }, { x: 0, y: 100 }, 'top', 'bottom')).toBe(
      'straight'
    );
    expect(determineAutoRoutingStyle({ x: 0, y: 0 }, { x: 50, y: 100 }, 'top', 'bottom')).toBe(
      'orthogonal'
    );
  });

  it('falls back for unconnected endpoints', () => {
    expect(determineAutoRoutingStyle({ x: 0, y: 0 }, { x: 10, y: 10 })).toBe('straight');
    expect(determineAutoRoutingStyle({ x: 0, y: 0 }, { x: 100, y: 100 })).toBe('orthogonal');
  });

  it('defaults to orthogonal for unmatched port combinations', () => {
    expect(
      determineAutoRoutingStyle({ x: 0, y: 0 }, { x: 100, y: 100 }, 'right', 'bottom')
    ).toBe('orthogonal');
  });
});

describe('findNearestShapePort', () => {
  it('snaps to the port within range', () => {
    expect(findNearestShapePort({ x: 105, y: 30 }, [rect('a', 0, 0), rect('b', 200, 0)])).toEqual({
      elementId: 'a',
      port: 'right',
      x: 100,
      y: 30,
    });
  });

  it('honors the ignoreElementId param', () => {
    expect(
      findNearestShapePort({ x: 210, y: 30 }, [rect('a', 0, 0), rect('b', 200, 0)], 'a')
    ).toEqual({
      elementId: 'b',
      port: 'left',
      x: 200,
      y: 30,
    });
  });

  it('snaps to the optimal port when inside a large shape, even beyond port range', () => {
    // Center (100,100) of a 200x200 shape is 100px from every port (over the 60px
    // threshold), but the inside-bbox check still snaps to the nearest port.
    expect(findNearestShapePort({ x: 100, y: 100 }, [rect('c', 0, 0, 200, 200)])).toEqual({
      elementId: 'c',
      port: 'top',
      x: 100,
      y: 0,
    });
  });

  it('returns null when nothing is in range', () => {
    expect(findNearestShapePort({ x: 1000, y: 1000 }, [rect('a', 0, 0)])).toBeNull();
    expect(findNearestShapePort({ x: 10, y: 10 }, [])).toBeNull();
  });

  it('ignores connector elements', () => {
    const result = findNearestShapePort(
      { x: 105, y: 30 },
      [rect('a', 0, 0), arrow('conn')]
    );
    expect(result).toEqual({ elementId: 'a', port: 'right', x: 100, y: 30 });
  });
});

describe('getCurvedPathD', () => {
  it('emits a straight line for very short distances', () => {
    expect(getCurvedPathD(0, 0, 2, 2)).toBe('M 0 0 L 2 2');
  });

  it('builds a quadratic curve through a waypoint', () => {
    // cp = 2*waypoint - 0.5*(start + end)
    expect(getCurvedPathD(0, 0, 100, 0, { x: 50, y: 50 })).toBe('M 0 0 Q 50 100, 100 0');
  });

  it('builds a horizontal S-curve with perpendicular control points', () => {
    expect(getCurvedPathD(0, 0, 100, 0)).toBe('M 0 0 C 35 0, 65 0, 100 0');
  });

  it('builds a vertical S-curve', () => {
    expect(getCurvedPathD(0, 0, 0, 100)).toBe('M 0 0 C 0 35, 0 65, 0 100');
  });
});

describe('getArrowMidpoint', () => {
  it('averages the endpoints', () => {
    expect(getArrowMidpoint(0, 0, 100, 0)).toEqual({ x: 50, y: 0 });
  });

  it('returns the waypoint when present', () => {
    expect(getArrowMidpoint(0, 0, 100, 0, { x: 30, y: 40 })).toEqual({ x: 30, y: 40 });
  });
});
