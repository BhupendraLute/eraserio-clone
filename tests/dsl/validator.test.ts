import { describe, expect, it } from 'vitest';
import { validate } from '@/lib/dsl/validator';
import type { DiagramAST } from '@/lib/dsl/ast';

function ast(overrides: Partial<DiagramAST>): DiagramAST {
  return { type: 'flowchart', nodes: [], edges: [], ...overrides };
}

describe('validate', () => {
  it('returns no errors for a valid, connected flowchart', () => {
    const result = validate(
      ast({
        nodes: [
          { id: 'A', label: 'A', attrs: {}, line: 2 },
          { id: 'B', label: 'B', attrs: {}, line: 3 },
        ],
        edges: [{ from: 'A', to: 'B', arrowType: 'sync', line: 4 }],
      })
    );
    expect(result).toEqual([]);
  });

  it('flags an unknown diagram type as a blocking error', () => {
    const result = validate(ast({ type: 'unknown' }));
    expect(result).toEqual([
      {
        message: "Unknown diagram type. First line must be 'flowchart' or 'sequence-diagram'.",
        severity: 'error',
      },
    ]);
  });

  it('flags a node with an empty id', () => {
    const result = validate(
      ast({ nodes: [{ id: '', label: '', attrs: {}, line: 2 }] })
    );
    expect(result[0]).toMatchObject({
      message: 'Node has an empty name.',
      line: 2,
      severity: 'error',
    });
  });

  // NOTE: the AST builder dedupes nodes by id (a Map keyed by id), so this
  // branch can't fire through the real parse pipeline — it is reachable only
  // if an AST is built manually, as done here.
  it('flags duplicate node ids', () => {
    const result = validate(
      ast({
        nodes: [
          { id: 'A', label: 'A', attrs: {}, line: 2 },
          { id: 'A', label: 'B', attrs: {}, line: 3 },
        ],
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      message: 'Duplicate node "A".',
      line: 3,
      severity: 'error',
    });
  });

  it('warns (non-blocking) about an unknown icon attribute', () => {
    const result = validate(
      ast({ nodes: [{ id: 'A', label: 'A', attrs: { icon: 'nope' }, line: 2 }] })
    );
    expect(result).toHaveLength(1);
    expect(result[0].message).toMatch(/^Unknown icon "nope"\./);
    expect(result[0].message).toContain('Supported: user, users, database');
    expect(result[0].severity).toBe('warning');
  });

  it('accepts a known icon name without warnings', () => {
    const result = validate(
      ast({ nodes: [{ id: 'A', label: 'A', attrs: { icon: 'database' }, line: 2 }] })
    );
    expect(result).toEqual([]);
  });

  it('flags edges that reference unknown nodes', () => {
    const result = validate(
      ast({
        nodes: [{ id: 'A', label: 'A', attrs: {}, line: 2 }],
        edges: [
          { from: 'A', to: 'Ghost', arrowType: 'sync', line: 3 },
          { from: 'Phantom', to: 'A', arrowType: 'async', line: 4 },
        ],
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      message: 'Edge references unknown node "Ghost".',
      line: 3,
      severity: 'error',
    });
    expect(result[1]).toMatchObject({
      message: 'Edge references unknown node "Phantom".',
      line: 4,
      severity: 'error',
    });
  });
});
