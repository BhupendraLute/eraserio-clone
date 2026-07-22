import { linter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';

// CodeMirror's `linter()` extension can re-run its source on its own
// debounce after doc changes. We don't want that second, uncoordinated
// path fighting with our worker-driven updates — so the source here is
// passive: it just returns whatever we last pushed. All real updates
// happen through pushDiagnostics(), called from the pipeline worker's
// onmessage handler.
let latestDiagnostics: Diagnostic[] = [];

export function dslLinter() {
  return linter(() => latestDiagnostics, { delay: 5000 });
}

// Push fresh diagnostics onto a live view immediately, bypassing
// CodeMirror's internal debounce entirely.
export function pushDiagnostics(view: EditorView, diagnostics: Diagnostic[]) {
  latestDiagnostics = diagnostics;
  view.dispatch(setDiagnostics(view.state, diagnostics));
}