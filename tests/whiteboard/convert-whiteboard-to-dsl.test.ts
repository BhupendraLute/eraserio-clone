import { describe, expect, it } from 'vitest';
import { convertWhiteboardToDsl } from '@/lib/whiteboard/convert-whiteboard-to-dsl';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';

describe('convertWhiteboardToDsl', () => {
  it('returns empty string for empty elements array', () => {
    expect(convertWhiteboardToDsl([])).toBe('');
  });

  it('serializes rectangle, cloud icon shapes, and arrow connectors to DSL flowchart code', () => {
    const elements: WhiteboardElement[] = [
      {
        id: 'node-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 160,
        height: 70,
        label: 'Auth Service',
        strokeColor: '#22c55e',
        strokeWidth: 2,
      },
      {
        id: 'node-2',
        type: 'cloud',
        x: 100,
        y: 300,
        width: 80,
        height: 80,
        iconKind: 'iconify-postgresql',
        label: 'User DB',
        strokeColor: '#f43f5e',
        strokeWidth: 2,
      },
      {
        id: 'arrow-1',
        type: 'arrow',
        x: 100,
        y: 170,
        width: 10,
        height: 130,
        startX: 180,
        startY: 170,
        endX: 180,
        endY: 300,
        fromElementId: 'node-1',
        toElementId: 'node-2',
        label: 'SQL Session Query',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
      },
    ];

    const dsl = convertWhiteboardToDsl(elements);
    expect(dsl).toContain('flowchart');
    expect(dsl).toContain('Auth_Service');
    expect(dsl).toContain('User_DB');
    expect(dsl).toContain('icon: postgres');
    expect(dsl).toContain('Auth_Service > User_DB: SQL Session Query');
  });

  it('handles custom shapes (circle, diamond, cylinder) and dashed lines', () => {
    const elements: WhiteboardElement[] = [
      {
        id: 'n1',
        type: 'circle',
        x: 0,
        y: 0,
        width: 60,
        height: 60,
        label: 'Start Node',
        strokeColor: '#a855f7',
        strokeWidth: 2,
      },
      {
        id: 'n2',
        type: 'diamond',
        x: 100,
        y: 0,
        width: 80,
        height: 80,
        label: 'Decision Gate',
        strokeColor: '#f59e0b',
        strokeWidth: 2,
      },
      {
        id: 'n3',
        type: 'cylinder',
        x: 200,
        y: 0,
        width: 80,
        height: 80,
        label: 'Redis Cache',
        strokeColor: '#6b7280',
        strokeWidth: 2,
      },
      {
        id: 'c1',
        type: 'arrow',
        x: 60,
        y: 30,
        width: 40,
        height: 10,
        startX: 60,
        startY: 30,
        endX: 100,
        endY: 30,
        fromElementId: 'n1',
        toElementId: 'n2',
        lineStyle: 'dashed',
        label: 'Async',
        strokeColor: '#3b82f6',
        strokeWidth: 2,
      },
    ];

    const dsl = convertWhiteboardToDsl(elements);
    expect(dsl).toContain('Start_Node: Start Node [shape: circle, color: purple]');
    expect(dsl).toContain('Decision_Gate: Decision Gate [shape: diamond, color: amber]');
    expect(dsl).toContain('Redis_Cache: Redis Cache [shape: cylinder, color: gray]');
    expect(dsl).toContain('Start_Node --> Decision_Gate: Async');
  });

  it('skips comments, frames, and freehand pencil strokes', () => {
    const elements: WhiteboardElement[] = [
      {
        id: 'comment-1',
        type: 'comment',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        text: 'This is a comment thread',
        author: 'User',
        resolved: false,
        color: 'blue',
        strokeColor: '#3b82f6',
        strokeWidth: 1,
      },
      {
        id: 'pencil-1',
        type: 'pencil',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        strokeColor: '#3b82f6',
        strokeWidth: 1,
        points: [{ x: 0, y: 0 }],
      },
    ];

    expect(convertWhiteboardToDsl(elements)).toBe('');
  });
});
