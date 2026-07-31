import { describe, expect, it } from 'vitest';
import { tokenize } from '@/lib/dsl/lexer';
import { parse } from '@/lib/dsl/parser';
import { cstToAst } from '@/lib/dsl/ast';

// Parse + build the AST. This asserts the source parses without errors (a
// precondition for visiting the CST) and is therefore only used with valid
// inputs.
function toAst(source: string) {
  const { tokens } = tokenize(source);
  const result = parse(tokens);
  expect(result.errors).toHaveLength(0);
  return cstToAst(result.cst);
}

describe('cstToAst', () => {
  it('detects flowchart and sequence-diagram types', () => {
    expect(toAst('flowchart\nA').type).toBe('flowchart');
    expect(toAst('sequence-diagram\nA').type).toBe('sequence-diagram');
  });

  it('is case-insensitive when detecting the diagram type', () => {
    expect(toAst('FlowChart\nA').type).toBe('flowchart');
    expect(toAst('  SEQUENCE-DIAGRAM\nA').type).toBe('sequence-diagram');
  });

  it('falls back to "unknown" for an unrecognized first line', () => {
    expect(toAst('banana\nA').type).toBe('unknown');
  });

  it('parses explicit id and label from "id: label"', () => {
    const ast = toAst('flowchart\nAPI Gateway: Gateway');
    expect(ast.nodes).toEqual([
      { id: 'API Gateway', label: 'Gateway', attrs: {}, line: 2 },
    ]);
  });

  it('uses the id as the label when no explicit label is given', () => {
    const ast = toAst('flowchart\nDatabase');
    expect(ast.nodes[0]).toMatchObject({ id: 'Database', label: 'Database' });
  });

  it('parses the attribute list into an attrs record', () => {
    const ast = toAst('flowchart\nDB [icon: database, color: blue]');
    expect(ast.nodes[0].attrs).toEqual({ icon: 'database', color: 'blue' });
  });

  it('maps ">" to sync and "-->" to async arrows', () => {
    const ast = toAst('flowchart\nA > B\nC --> D');
    expect(ast.edges[0].arrowType).toBe('sync');
    expect(ast.edges[1].arrowType).toBe('async');
  });

  it('captures the edge label after the colon', () => {
    const ast = toAst('flowchart\nA > B: hello');
    expect(ast.edges[0].label).toBe('hello');
    expect(ast.edges[0].from).toBe('A');
    expect(ast.edges[0].to).toBe('B');
  });

  it('leaves the edge label undefined when no colon is present', () => {
    const ast = toAst('flowchart\nA > B');
    expect(ast.edges[0].label).toBeUndefined();
  });

  it('implicitly creates nodes referenced by edges with label = id', () => {
    const ast = toAst('flowchart\nA --> B');
    expect(ast.nodes).toHaveLength(2);
    expect(ast.nodes[0]).toMatchObject({ id: 'A', label: 'A' });
    expect(ast.nodes[1]).toMatchObject({ id: 'B', label: 'B' });
  });

  it('records source line numbers for nodes and edges', () => {
    const ast = toAst('flowchart\nA\nB --> C');
    expect(ast.nodes[0].line).toBe(2);
    expect(ast.nodes[1].line).toBe(3);
    expect(ast.edges[0].line).toBe(3);
  });

  it('merges attrs and keeps the latest label across re-declarations', () => {
    const ast = toAst('flowchart\nDB: Database\nDB [icon: database]\nDB: Warehouse');
    expect(ast.nodes).toHaveLength(1);
    expect(ast.nodes[0]).toMatchObject({
      id: 'DB',
      label: 'Warehouse',
      attrs: { icon: 'database' },
    });
  });

  it('resets the label to the id when re-declared without an explicit label', () => {
    const ast = toAst('flowchart\nA: Nice label\nA [color: blue]');
    expect(ast.nodes[0]).toMatchObject({ id: 'A', label: 'A', attrs: { color: 'blue' } });
  });
});
