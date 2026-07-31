# 08 · Web Worker Pipeline

> **What this document covers**: how diagram parsing runs off the main thread —
> `src/workers/pipeline.worker.ts`, the `usePipelineWorker` hook, the synchronous fallback
> `run-pipeline-sync.ts`, and the diagnostic plumbing.

---

## 1. Why a Web Worker?

Parsing + layout (Dagre) can take a few milliseconds — enough to make typing feel laggy if done on
the main thread. The worker offloads it so **typing stays at 60fps** and the canvas re-renders only
when results arrive.

```mermaid
sequenceDiagram
    participant CM as CodeMirror
    participant DS as diagram-store
    participant Hook as usePipelineWorker
    participant W as Web Worker
    participant Engine as dsl+layout engine

    CM->>DS: setSource(newSource)
    DS-->>Hook: source changed (subscription)
    Hook->>Hook: debounce 200ms
    Hook->>Hook: requestId = ++requestId; latestSentId = requestId
    Hook->>W: postMessage({ id: requestId, source })
    W->>Engine: tokenize → parse → cstToAst → validate → layout
    Engine-->>W: result
    W-->>Hook: postMessage(PipelineSuccess | PipelineFailure)
    Hook->>Hook: res.id === latestSentId.current ? apply : IGNORE
    Hook->>DS: applyResult() / setErrors()
    DS-->>CM: pushDiagnostics(view, diags)
```

---

## 2. The Worker Entry Point — `pipeline.worker.ts`

**File**: `src/workers/pipeline.worker.ts`

The worker receives `{ id, source }` and runs the whole engine synchronously inside its own thread:

```ts
self.onmessage = (event: MessageEvent<PipelineRequest>) => {
  const { id, source } = event.data;
  try {
    const lexResult = tokenize(source);
    if (lexResult.errors.length > 0) return respond(id, toErrors('lex', lexResult.errors, 'error'));

    const parseResult = parse(lexResult.tokens);
    if (parseResult.errors.length > 0) {
      const humanized = parseResult.errors.map((err) => {
        const { message, line } = humanizeParseError(err);
        return { stage: 'parse', message, line, severity: 'error' };
      });
      return respond(id, humanized);
    }

    const ast = cstToAst(parseResult.cst);
    const validationErrors = validate(ast);
    const blocking = validationErrors.filter((e) => e.severity === 'error');
    if (blocking.length > 0) return respond(id, toValidationErrors('validate', validationErrors));

    let result: PipelineDiagramResult;
    if (ast.type === 'sequence-diagram') {
      result = { kind: 'sequence', ...sequenceLayout(ast) };
    } else {
      const { nodes, edges } = dagreLayout(ast);
      result = { kind: 'flowchart', nodes, edges };
    }

    const success: PipelineSuccess = { id, ok: true, result, diagnostics: toValidationErrors('validate', warnings) };
    (self as unknown as Worker).postMessage(success);
  } catch (err) {
    respond(id, [{ stage: 'layout', message: ..., severity: 'error' }]);
  }
};
```

### The message types

```ts
export interface PipelineRequest  { id: number; source: string }
export type PipelineDiagramResult =
  | { kind: 'flowchart'; nodes: LaidOutNode[]; edges: LaidOutEdge[] }
  | ({ kind: 'sequence' } & SequenceLayoutResult);

export interface PipelineSuccess { id: number; ok: true;  result: PipelineDiagramResult; diagnostics: PipelineError[] }
export interface PipelineFailure { id: number; ok: false; errors: PipelineError[] }

export interface PipelineError {
  stage: 'lex' | 'parse' | 'validate' | 'layout';
  message: string; line?: number; column?: number;
  severity: 'error' | 'warning';
}
```

> **Beginner note on `warnings`**: on a successful parse, validation *warnings* are passed along as
> `diagnostics` (non-blocking). On failure, blocking errors *and* any warnings are returned together
> so the user sees everything at once — a nice UX touch.

---

## 3. The Hook — `usePipelineWorker.ts`

**File**: `src/lib/hooks/usePipelineWorker.ts`

This hook is called from both `EraserWorkspace` and `DiagramEditorView` (each instantiates the
worker once). ⚠️ Note: `EraserWorkspace` calls `usePipelineWorker()` **unconditionally** regardless
of the active tab, so when the Diagram-as-Code tab is open, **two workers exist simultaneously**
(one from `EraserWorkspace`, one from `DiagramEditorView`). It's redundant but harmless — both
post the same debounced requests and the stale guard dedupes responses.

It does three things:

### 3.1 Create & terminate the worker

```ts
useEffect(() => {
  const w = new Worker(new URL('../../workers/pipeline.worker.ts', import.meta.url));
  setWorker(w);
  return () => w.terminate();   // clean up on unmount
}, []);
```

### 3.2 Handle responses with a stale guard

```ts
useEffect(() => {
  if (!worker) return;
  worker.onmessage = (event: MessageEvent<PipelineResponse>) => {
    const res = event.data;
    if (res.id !== latestSentId.current) return; // 🛡️ stale response — ignore

    const view = useDiagramStore.getState().editorView;
    if (res.ok) {
      applyResult(res.result, res.diagnostics);
      if (view) pushDiagnostics(view, pipelineErrorsToDiagnostics(view.state, res.diagnostics));
    } else {
      setErrors(res.errors);
      if (view) pushDiagnostics(view, pipelineErrorsToDiagnostics(view.state, res.errors));
    }
  };
}, [worker, applyResult, setErrors]);
```

### 3.3 Debounce + send, and hot-sync the registry

```ts
useEffect(() => {
  if (!worker) return;
  // Keep the registry's stored source in sync so doc embeds always show current content
  const currentDiagramId = useDiagramStore.getState().currentDiagramId;
  if (currentDiagramId) useDiagramRegistry.getState().updateSource(currentDiagramId, source);

  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    const id = ++requestId.current;
    latestSentId.current = id;
    setPending();
    worker.postMessage({ id, source });
  }, DEBOUNCE_MS); // 200ms
}, [source, worker, setPending]);
```

---

## 4. The Synchronous Path — `run-pipeline-sync.ts`

**File**: `src/lib/dsl/run-pipeline-sync.ts`

Used by **docs embeds** (`DiagramPreview.tsx`) — small diagrams don't need a worker:

```ts
export type SyncPipelineResult =
  | { ok: true; kind: 'flowchart'; nodes: LaidOutNode[]; edges: LaidOutEdge[] }
  | ({ ok: true; kind: 'sequence' } & SequenceLayoutResult)
  | { ok: false; message: string };

export function runPipelineSync(source: string): SyncPipelineResult {
  // tokenize → parse → cstToAst → validate (blocking only) → layout
  // returns { ok: false, message } on the FIRST blocking error
}
```

---

## 5. Diagnostics → CodeMirror

Two small helpers connect pipeline errors to the editor's squiggly underlines:

- **`diagnostics.ts`** — `pipelineErrorsToDiagnostics(state, errors)` converts `PipelineError[]`
  into CodeMirror `Diagnostic[]`, clamping the line number to the document and using
  `e.severity` directly (CodeMirror's severity is `'error' | 'warning'` too).
- **`codemirror-lint.ts`** — `dslLinter()` returns a **passive** linter that just returns whatever
  was last pushed (`latestDiagnostics`), with a 5s delay. All real updates flow through
  `pushDiagnostics(view, diagnostics)`, which dispatches immediately — this avoids two competing
  lint paths fighting each other (the worker-driven one and CodeMirror's built-in debounce).

---

## 6. Troubleshooting the Worker

| Symptom | Cause / Fix |
|---|---|
| Changes to `lexer.ts`/`parser.ts` don't show up | The worker bundle isn't hot-reloaded → **restart `npm run dev`** or hard refresh |
| Errors in console: "Worker is not defined" | Worker was created during SSR — always create inside `useEffect` |
| Diagram flickers/stutters while typing | Debounce handles this; if it persists, check for heavy logs in the worker |
| Stale diagram appears | The `id !== latestSentId` guard should prevent it; if you see it, the guard is broken — check `requestId` increments |
