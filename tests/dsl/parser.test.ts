import { describe, expect, it } from 'vitest';
import { tokenize } from '@/lib/dsl/lexer';
import { parse } from '@/lib/dsl/parser';
import { cstToAst } from '@/lib/dsl/ast';

// Parse only — used for asserting grammar acceptance / rejection.
function parseSource(source: string) {
  const { tokens } = tokenize(source);
  return parse(tokens);
}

// Parse + build the AST — only safe on sources that parse without errors,
// since visiting a partial CST can throw.
function toAst(source: string) {
  const { tokens } = tokenize(source);
  const result = parse(tokens);
  expect(result.errors).toHaveLength(0);
  return cstToAst(result.cst);
}

describe('parse', () => {
  it('accepts a valid flowchart with no errors', () => {
    const { errors } = parseSource('flowchart\nA\nB --> C\nC > D: data');
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid sequence-diagram with no errors', () => {
    const { errors } = parseSource('sequence-diagram\nUser\nAPI\nUser --> API: ping');
    expect(errors).toHaveLength(0);
  });

  it('accepts a diagram with only a type line (no declarations)', () => {
    const { errors } = parseSource('flowchart');
    expect(errors).toHaveLength(0);
  });

  it('accepts node attributes', () => {
    const { errors } = parseSource('flowchart\nDB [icon: database, color: blue]');
    expect(errors).toHaveLength(0);
  });

  it('rejects a line that starts with an attribute list (missing node id)', () => {
    const { errors } = parseSource('flowchart\n[icon: database]');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an attribute pair without a colon', () => {
    const { errors } = parseSource('flowchart\nA [color]');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an edge with a dangling arrow (missing target)', () => {
    const { errors } = parseSource('flowchart\nA >');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('builds a usable AST for a valid flowchart', () => {
    const ast = toAst('flowchart\nA\nB --> C');
    expect(ast.type).toBe('flowchart');
    expect(ast.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C']);
    expect(ast.edges).toHaveLength(1);
  });
});
