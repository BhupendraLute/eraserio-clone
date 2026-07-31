import { describe, expect, it } from 'vitest';
import { sequenceLayout } from '@/lib/layout/sequence-layout';
import type { NodeDecl, EdgeDecl } from '@/lib/dsl/ast';

function actor(id: string): NodeDecl {
  return { id, label: id, attrs: {} };
}

function msg(from: string, to: string, overrides: Partial<EdgeDecl> = {}): EdgeDecl {
  return { from, to, arrowType: 'sync', ...overrides };
}

function layout(nodes: NodeDecl[], edges: EdgeDecl[] = []) {
  return sequenceLayout({ type: 'sequence-diagram', nodes, edges });
}

// Fallback char width at 13px = 7.15px. Actor width = max(90, label + 24).

describe('sequenceLayout', () => {
  it('places two short actors with the fixed gap and centers them', () => {
    const result = layout([actor('User'), actor('API')], [msg('User', 'API')]);

    // 'User' = 28.6px -> below the 90px minimum; center = margin (20) + 45
    expect(result.actors).toEqual([
      { id: 'User', label: 'User', x: 65, width: 90 },
      { id: 'API', label: 'API', x: 245, width: 90 },
    ]);
    expect(result.messages).toEqual([
      { from: 'User', to: 'API', label: undefined, arrowType: 'sync', y: 97.5 },
    ]);
    // width = max(200, rightmost edge (290) + right margin (20)) = 310
    expect(result.width).toBe(310);
    expect(result.height).toBe(155); // 50 header + 20 top + 55 + 30 bottom
  });

  it('stacks messages vertically with a fixed gap', () => {
    const result = layout(
      [actor('User'), actor('API')],
      [msg('User', 'API'), msg('API', 'User')]
    );
    expect(result.messages[0].y).toBe(97.5);
    expect(result.messages[1].y).toBe(152.5);
    expect(result.height).toBe(210); // 70 + 2 x 55 + 30
  });

  it('sizes actors to fit long labels', () => {
    const long = 'a'.repeat(20); // 143px wide
    const result = layout([{ id: 'X', label: long, attrs: {} }]);
    expect(result.actors[0].width).toBe(167); // 143 + 24 padding
    expect(result.actors[0].x).toBe(103.5); // 20 + 167/2
    expect(result.width).toBe(207); // right edge (187) + 20 margin
  });

  it('still reserves a message row when there are no messages', () => {
    const result = layout([actor('User')]);
    expect(result.messages).toEqual([]);
    expect(result.height).toBe(155); // max(1, 0) message rows
    expect(result.width).toBe(200); // single short actor stays at the minimum
  });

  it('spaces three actors evenly', () => {
    const result = layout([actor('A'), actor('B'), actor('C')]);
    // Each short actor advances the cursor by 90 width + 90 gap = 180.
    expect(result.actors.map((a) => a.x)).toEqual([65, 245, 425]);
    expect(result.width).toBe(490); // right edge (470) + 20 margin
  });

  it('keeps edge labels and arrow types on messages', () => {
    const result = layout(
      [actor('User'), actor('API')],
      [msg('User', 'API', { label: 'request', arrowType: 'async' })]
    );
    expect(result.messages[0]).toMatchObject({
      from: 'User',
      to: 'API',
      label: 'request',
      arrowType: 'async',
    });
  });
});
