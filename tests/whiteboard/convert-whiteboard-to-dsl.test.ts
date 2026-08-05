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
});
