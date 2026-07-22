import { tokenize } from '@/lib/dsl/lexer';
import { parse } from '@/lib/dsl/parser';
import { cstToAst } from '@/lib/dsl/ast';
import { validate, type ValidationError } from '@/lib/dsl/validator';
import { dagreLayout } from '@/lib/layout/dagre-adapter';
import type { DiagramAST } from '@/lib/dsl/ast';
import type { LaidOutNode, LaidOutEdge } from '@/lib/layout/types';

// ---- Message protocol ----

export interface PipelineRequest {
  id: number;          // request id, so the UI can discard stale responses
  source: string;       // raw DSL text
}

export interface PipelineSuccess {
  id: number;
  ok: true;
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
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

// ---- Worker entry point ----

self.onmessage = (event: MessageEvent<PipelineRequest>) => {
  const { id, source } = event.data;

  try {
    // 1. Lex
    const lexResult = tokenize(source);
    if (lexResult.errors.length > 0) {
      return respond(id, toErrors('lex', lexResult.errors));
    }

    // 2. Parse (tokens -> CST)
    const parseResult = parse(lexResult.tokens);
    if (parseResult.errors.length > 0) {
      return respond(id, toErrors('parse', parseResult.errors));
    }

    // 3. CST -> AST
    const ast: DiagramAST = cstToAst(parseResult.cst);

    // 4. Validate
    const validationErrors: ValidationError[] = validate(ast);
    if (validationErrors.length > 0) {
      return respond(id, toErrors('validate', validationErrors));
    }

    // 5. Layout
    const { nodes, edges } = dagreLayout(ast);

    const success: PipelineSuccess = { id, ok: true, nodes, edges };
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
  return raw.map((e) => ({
    stage,
    message: e.message,
    line: e.line,
    column: e.column,
  }));
}