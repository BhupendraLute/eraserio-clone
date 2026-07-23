import type { Diagnostic } from '@codemirror/lint';
import type { EditorState } from '@codemirror/state';
import type { PipelineError } from '@/workers/pipeline.worker';

export function pipelineErrorsToDiagnostics(
  state: EditorState,
  errors: PipelineError[]
): Diagnostic[] {
  const doc = state.doc;
  return errors.map((e) => {
    const lineNum = e.line && e.line >= 1 && e.line <= doc.lines ? e.line : 1;
    const line = doc.line(lineNum);
    return {
      from: line.from,
      to: line.to,
      severity: e.severity, // 'error' | 'warning', maps directly to CodeMirror's own type
      message: `${e.stage}: ${e.message}`,
    };
  });
}