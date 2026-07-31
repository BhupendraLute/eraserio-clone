import { describe, expect, it } from 'vitest';
import {
  clipToRectBoundary,
  straightEdgePath,
  midpointOfPath,
  selfLoopPath,
  sameRankEdgePath,
  isDegenerateRoute,
} from '@/lib/render/edge-geometry';
import type { LaidOutNode } from '@/lib/layout/types';

function node(x: number, y: number, width = 100, height = 60, id = 'n'): LaidOutNode {
  return { id, label: id, attrs: {}, x, y, width, height, lines: [] };
}

describe('clipToRectBoundary', () => {
  const n = node(0, 0, 100, 60); // center (50, 30)

  it('clips to the right/left edges for horizontal targets', () => {
    expect(clipToRectBoundary(n, { x: 100, y: 30 })).toEqual({ x: 100, y: 30 });
    expect(clipToRectBoundary(n, { x: 0, y: 30 })).toEqual({ x: 0, y: 30 });
  });

  it('clips to the top/bottom edges for vertical targets', () => {
    expect(clipToRectBoundary(n, { x: 50, y: 0 })).toEqual({ x: 50, y: 0 });
    expect(clipToRectBoundary(n, { x: 50, y: 60 })).toEqual({ x: 50, y: 60 });
  });

  it('clips diagonal targets to whichever edge the ray exits first', () => {
    // Ray toward (150, 0) exits through the right edge at y = 15.
    expect(clipToRectBoundary(n, { x: 150, y: 0 })).toEqual({ x: 100, y: 15 });
  });

  it('returns the center when the target is the center', () => {
    expect(clipToRectBoundary(n, { x: 50, y: 30 })).toEqual({ x: 50, y: 30 });
  });
});

describe('straightEdgePath', () => {
  it('joins the two box borders with a straight line', () => {
    expect(straightEdgePath(node(0, 0), node(200, 0))).toEqual([
      { x: 100, y: 30 },
      { x: 200, y: 30 },
    ]);
  });
});

describe('midpointOfPath', () => {
  it('handles empty and single-point paths', () => {
    expect(midpointOfPath([])).toEqual({ x: 0, y: 0 });
    expect(midpointOfPath([{ x: 5, y: 6 }])).toEqual({ x: 5, y: 6 });
  });

  it('finds the middle of a straight 2-point path', () => {
    expect(
      midpointOfPath([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])
    ).toEqual({ x: 50, y: 0 });
  });

  it('walks the polyline by arc length, not by point index', () => {
    // Segments: 50 + ~111.8 = ~161.8 total; halfway lands on the second segment.
    const mid = midpointOfPath([
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 100 },
    ]);
    expect(mid.x).toBeCloseTo(63.82, 2);
    expect(mid.y).toBeCloseTo(27.64, 2);
  });

  it('returns the first point for a zero-length path', () => {
    expect(
      midpointOfPath([
        { x: 3, y: 4 },
        { x: 3, y: 4 },
      ])
    ).toEqual({ x: 3, y: 4 });
  });
});

describe('selfLoopPath', () => {
  it('draws a loop out to the right of the node and back', () => {
    expect(selfLoopPath(node(0, 0))).toEqual([
      { x: 100, y: 18 },
      { x: 150, y: 18 },
      { x: 150, y: 42 },
      { x: 100, y: 42 },
    ]);
  });
});

describe('sameRankEdgePath', () => {
  it('routes below both boxes with a shallow drop', () => {
    expect(sameRankEdgePath(node(0, 0), node(150, 0))).toEqual([
      { x: 50, y: 60 },
      { x: 50, y: 90 },
      { x: 200, y: 90 },
      { x: 200, y: 60 },
    ]);
  });
});

describe('isDegenerateRoute', () => {
  it('flags empty and single-point routes', () => {
    expect(isDegenerateRoute([])).toBe(true);
    expect(isDegenerateRoute([{ x: 0, y: 0 }])).toBe(true);
  });

  it('flags routes whose endpoints essentially coincide', () => {
    expect(
      isDegenerateRoute([
        { x: 0, y: 0 },
        { x: 0, y: 3 },
      ])
    ).toBe(true);
  });

  it('accepts routes with real separation', () => {
    expect(
      isDegenerateRoute([
        { x: 0, y: 0 },
        { x: 0, y: 10 },
      ])
    ).toBe(false);
    expect(
      isDegenerateRoute([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
      ])
    ).toBe(false);
  });
});
