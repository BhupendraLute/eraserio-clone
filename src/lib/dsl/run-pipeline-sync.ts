import { tokenize } from './lexer';
import { parse } from './parser';
import { cstToAst } from './ast';
import { validate } from './validator';
import { dagreLayout } from '../layout/dagre-adapter';
import { sequenceLayout } from '../layout/sequence-layout';
import type { LaidOutNode, LaidOutEdge } from '../layout/types';
import type { SequenceLayoutResult } from '../layout/sequence-types';

export type SyncPipelineResult =
  | { ok: true; kind: 'flowchart'; nodes: LaidOutNode[]; edges: LaidOutEdge[] }
  | ({ ok: true; kind: 'sequence' } & SequenceLayoutResult)
  | { ok: false; message: string };

export function runPipelineSync(source: string): SyncPipelineResult {
  const lexResult = tokenize(source);
  if (lexResult.errors.length > 0) {
    return { ok: false, message: lexResult.errors[0].message };
  }

  const parseResult = parse(lexResult.tokens);
  if (parseResult.errors.length > 0) {
    return { ok: false, message: 'Diagram has a syntax error.' };
  }

  const ast = cstToAst(parseResult.cst);
  const validationErrors = validate(ast);
  const blocking = validationErrors.filter((e) => e.severity === 'error');
  if (blocking.length > 0) {
    return { ok: false, message: blocking[0].message };
  }

  if (ast.type === 'sequence-diagram') {
    const seq = sequenceLayout(ast);
    return { ok: true, kind: 'sequence', ...seq };
  }

  const { nodes, edges } = dagreLayout(ast);
  return { ok: true, kind: 'flowchart', nodes, edges };
}