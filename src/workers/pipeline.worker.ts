import { tokenize } from '@/lib/dsl/lexer';
import { parse } from '@/lib/dsl/parser';
import { cstToAst } from '@/lib/dsl/ast';
import { validate, type ValidationError } from '@/lib/dsl/validator';
import { dagreLayout } from '@/lib/layout/dagre-adapter';
import { sequenceLayout } from '@/lib/layout/sequence-layout';
import type { DiagramAST } from '@/lib/dsl/ast';
import type { LaidOutNode, LaidOutEdge } from '@/lib/layout/types';
import type { SequenceLayoutResult } from '@/lib/layout/sequence-types';

export interface PipelineRequest {
  id: number;
  source: string;
}

export type PipelineDiagramResult =
  | { kind: 'flowchart'; nodes: LaidOutNode[]; edges: LaidOutEdge[] }
  | ({ kind: 'sequence' } & SequenceLayoutResult);

export interface PipelineSuccess {
  id: number;
  ok: true;
  result: PipelineDiagramResult;
}

export interface PipelineFailure {
  id: number;
  ok: false;
  errors: PipelineError[];
}

export interface PipelineError {
  stage: 'lex' | 'parse' | 'validate' | 'layout';
  message: string;
  line?: number;
  column?: number;
}

export type PipelineResponse = PipelineSuccess | PipelineFailure;

self.onmessage = (event: MessageEvent<PipelineRequest>) => {
  const { id, source } = event.data;

  try {
    const lexResult = tokenize(source);
    if (lexResult.errors.length > 0) {
      return respond(id, toErrors('lex', lexResult.errors));
    }

    const parseResult = parse(lexResult.tokens);
    if (parseResult.errors.length > 0) {
      return respond(id, toErrors('parse', parseResult.errors));
    }

    const ast: DiagramAST = cstToAst(parseResult.cst);

    const validationErrors: ValidationError[] = validate(ast);
    if (validationErrors.length > 0) {
      return respond(id, toErrors('validate', validationErrors));
    }

    let result: PipelineDiagramResult;
    if (ast.type === 'sequence-diagram') {
      const seq = sequenceLayout(ast);
      result = { kind: 'sequence', ...seq };
    } else {
      const { nodes, edges } = dagreLayout(ast);
      result = { kind: 'flowchart', nodes, edges };
    }

    const success: PipelineSuccess = { id, ok: true, result };
    (self as unknown as Worker).postMessage(success);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error';
    respond(id, [{ stage: 'layout', message }]);
  }
};

function respond(id: number, errors: PipelineError[]) {
  const failure: PipelineFailure = { id, ok: false, errors };
  (self as unknown as Worker).postMessage(failure);
}

function toErrors(
  stage: PipelineError['stage'],
  raw: Array<{ message: string; line?: number; column?: number }>
): PipelineError[] {
  return raw.map((e) => ({ stage, message: e.message, line: e.line, column: e.column }));
}