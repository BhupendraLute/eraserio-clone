import { tokenize } from '@/lib/dsl/lexer';
import { parse } from '@/lib/dsl/parser';
import { cstToAst } from '@/lib/dsl/ast';
import { validate, type ValidationError } from '@/lib/dsl/validator';
import { dagreLayout } from '@/lib/layout/dagre-adapter';
import { sequenceLayout } from '@/lib/layout/sequence-layout';
import type { DiagramAST } from '@/lib/dsl/ast';
import type { LaidOutNode, LaidOutEdge } from '@/lib/layout/types';
import type { SequenceLayoutResult } from '@/lib/layout/sequence-types';
import { humanizeParseError } from '@/lib/dsl/error-messages';

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
  diagnostics: PipelineError[]; // non-blocking warnings only
}

export interface PipelineFailure {
  id: number;
  ok: false;
  errors: PipelineError[]; // includes any warnings alongside the blocking error(s)
}

export type PipelineSeverity = 'error' | 'warning';

export interface PipelineError {
  stage: 'lex' | 'parse' | 'validate' | 'layout';
  message: string;
  line?: number;
  column?: number;
  severity: PipelineSeverity;
}

export type PipelineResponse = PipelineSuccess | PipelineFailure;

self.onmessage = (event: MessageEvent<PipelineRequest>) => {
  const { id, source } = event.data;

  try {
    const lexResult = tokenize(source);
    if (lexResult.errors.length > 0) {
      return respond(id, toErrors('lex', lexResult.errors, 'error'));
    }

   const parseResult = parse(lexResult.tokens);
    if (parseResult.errors.length > 0) {
      const humanized = parseResult.errors.map((err) => {
        const { message, line } = humanizeParseError(err);
        return { stage: 'parse' as const, message, line, severity: 'error' as const };
      });
      return respond(id, humanized);
    }

    const ast: DiagramAST = cstToAst(parseResult.cst);

    const validationErrors: ValidationError[] = validate(ast);
    const blocking = validationErrors.filter((e) => e.severity === 'error');
    const warnings = validationErrors.filter((e) => e.severity === 'warning');

    if (blocking.length > 0) {
      // Surface both blocking errors and any warnings together, so the
      // user sees everything at once rather than fixing errors one
      // pass at a time only to discover warnings afterward.
      return respond(id, toValidationErrors('validate', validationErrors));
    }

    let result: PipelineDiagramResult;
    if (ast.type === 'sequence-diagram') {
      const seq = sequenceLayout(ast);
      result = { kind: 'sequence', ...seq };
    } else {
      const { nodes, edges } = dagreLayout(ast);
      result = { kind: 'flowchart', nodes, edges };
    }

    const success: PipelineSuccess = {
      id,
      ok: true,
      result,
      diagnostics: toValidationErrors('validate', warnings),
    };
    (self as unknown as Worker).postMessage(success);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error';
    respond(id, [{ stage: 'layout', message, severity: 'error' }]);
  }
};

function respond(id: number, errors: PipelineError[]) {
  const failure: PipelineFailure = { id, ok: false, errors };
  (self as unknown as Worker).postMessage(failure);
}

function toErrors(
  stage: PipelineError['stage'],
  raw: Array<{ message: string; line?: number; column?: number }>,
  severity: PipelineSeverity
): PipelineError[] {
  return raw.map((e) => ({ stage, message: e.message, line: e.line, column: e.column, severity }));
}

function toValidationErrors(stage: PipelineError['stage'], raw: ValidationError[]): PipelineError[] {
  return raw.map((e) => ({ stage, message: e.message, line: e.line, severity: e.severity }));
}