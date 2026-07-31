import { describe, expect, it } from 'vitest';
import { dagreLayout } from '@/lib/layout/dagre-adapter';
import type { DiagramAST, NodeDecl } from '@/lib/dsl/ast';

function ast(overrides: Partial<DiagramAST> = {}): DiagramAST {
  return { type: 'flowchart', nodes: [], edges: [], ...overrides };
}

function node(id: string, overrides: Partial<NodeDecl> = {}): NodeDecl {
  return { id, label: id, attrs: {}, ...overrides };
}

describe('dagreLayout', () => {
  it('sizes a short-label node to the minimum box', () => {
    const { nodes } = dagreLayout(
      ast({ nodes: [node('A', { label: 'Short' })] })
    );
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: 'A',
      label: 'Short',
      width: 120, // NODE_MIN_WIDTH — 'Short' (35.75px) + 40px padding < 120
      height: 50, // NODE_MIN_HEIGHT — one wrapped line
    });
    expect(nodes[0].lines).toEqual(['Short']);
    expect(typeof nodes[0].x).toBe('number');
    expect(typeof nodes[0].y).toBe('number');
  });

  it('lays a chain out top-to-bottom with shared column x', () => {
    const { nodes, edges } = dagreLayout(
      ast({
        nodes: [node('A'), node('B'), node('C')],
        edges: [
          { from: 'A', to: 'B', arrowType: 'sync' },
          { from: 'B', to: 'C', arrowType: 'sync' },
        ],
      })
    );
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId['A'].y).toBeLessThan(byId['B'].y);
    expect(byId['B'].y).toBeLessThan(byId['C'].y);
    // Single-column rank -> all nodes share the same top-left x.
    expect(byId['A'].x).toBeCloseTo(byId['B'].x, 5);
    expect(byId['B'].x).toBeCloseTo(byId['C'].x, 5);

    expect(edges).toHaveLength(2);
    expect(edges[0].points.length).toBeGreaterThanOrEqual(2);
  });

  it('places unconnected nodes side by side in the same rank', () => {
    const { nodes } = dagreLayout(ast({ nodes: [node('A'), node('B')] }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId['A'].y).toBeCloseTo(byId['B'].y, 5);
    expect(Math.abs(byId['A'].x - byId['B'].x)).toBeGreaterThan(10);
  });

  it('reserves extra width when a node has an icon', () => {
    const plain = dagreLayout(
      ast({ nodes: [node('A', { label: 'Database Server' })] })
    ).nodes[0];
    const withIcon = dagreLayout(
      ast({
        nodes: [node('A', { label: 'Database Server', attrs: { icon: 'database' } })],
      })
    ).nodes[0];

    expect(withIcon.width).toBeGreaterThan(plain.width);
    expect(plain.width).toBeGreaterThanOrEqual(120);
    expect(withIcon.width).toBeLessThanOrEqual(280);
  });

  it('caps wrapped labels at 3 lines with an ellipsis on the last', () => {
    // 34 'aa' words wrap to 11+11+11+1 = 4 lines, so the 4th line is dropped
    // and an ellipsis is appended to the (now-last) 3rd line.
    const longLabel = Array.from({ length: 34 }, () => 'aa').join(' ');
    const { nodes } = dagreLayout(ast({ nodes: [node('A', { label: longLabel })] }));
    const n = nodes[0];

    expect(n.lines).toHaveLength(3); // NODE_MAX_LINES
    expect(n.lines[2].endsWith('…')).toBe(true);
    expect(n.height).toBe(76); // 3 lines x 16px line height + 28px padding
  });

  it('preserves node attributes and edge labels through layout', () => {
    const { nodes, edges } = dagreLayout(
      ast({
        nodes: [node('A', { attrs: { color: 'red' } }), node('B')],
        edges: [{ from: 'A', to: 'B', label: 'hi', arrowType: 'sync' }],
      })
    );
    expect(nodes[0].attrs).toEqual({ color: 'red' });
    expect(edges[0].label).toBe('hi');
    expect(edges[0].from).toBe('A');
    expect(edges[0].to).toBe('B');
  });
});
