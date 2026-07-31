// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorState, type TransactionSpec } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
  diagnosticCount,
  forEachDiagnostic,
  setDiagnosticsEffect,
  type Diagnostic,
} from '@codemirror/lint';
import { dslLinter, pushDiagnostics } from '@/lib/dsl/codemirror-lint';
import { pipelineErrorsToDiagnostics } from '@/lib/dsl/diagnostics';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('dslLinter', () => {
  it('returns an installable lint extension', () => {
    const state = EditorState.create({ doc: 'flowchart', extensions: [dslLinter()] });
    expect(state.doc.toString()).toBe('flowchart');
  });
});

describe('pushDiagnostics', () => {
  // Extract the diagnostics carried by the transaction that a view dispatch
  // produced, by applying the captured TransactionSpec to a real state that
  // has the lint field installed (via dslLinter()).
  function dispatchedDiagnostics(dispatch: ReturnType<typeof vi.fn>, state: EditorState) {
    const spec = dispatch.mock.calls[0][0] as TransactionSpec;
    const tr = state.update(spec);
    const effect = tr.effects.find((e) => e.is(setDiagnosticsEffect));
    return effect?.value;
  }

  it('dispatches the diagnostics immediately through setDiagnostics', () => {
    const state = EditorState.create({ doc: 'flowchart', extensions: [dslLinter()] });
    const dispatch = vi.fn();
    const view = { state, dispatch } as unknown as EditorView;

    const diags: Diagnostic[] = [{ from: 0, to: 9, severity: 'error', message: 'parse: boom' }];
    pushDiagnostics(view, diags);

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatchedDiagnostics(dispatch, state)).toEqual(diags);
  });

  it('replaces the previous diagnostics on the next push', () => {
    const state = EditorState.create({ doc: 'flowchart', extensions: [dslLinter()] });
    const dispatch = vi.fn();
    const view = { state, dispatch } as unknown as EditorView;

    pushDiagnostics(view, [{ from: 0, to: 9, severity: 'error', message: 'one' }]);
    pushDiagnostics(view, [{ from: 0, to: 4, severity: 'warning', message: 'two' }]);

    expect(dispatch).toHaveBeenCalledTimes(2);
    const spec = dispatch.mock.calls[1][0] as TransactionSpec;
    const tr = state.update(spec);
    const effect = tr.effects.find((e) => e.is(setDiagnosticsEffect));
    expect(effect?.value).toEqual([{ from: 0, to: 4, severity: 'warning', message: 'two' }]);
  });

  it('makes pushed diagnostics visible through the lint state field', () => {
    // Two lines so both diagnostics (line 1 and line 2) stay in bounds — the
    // lint state clips diagnostics to the document, dropping out-of-range ones.
    const view = new EditorView({
      doc: 'flowchart\nA -> B',
      parent: document.body,
      extensions: [dslLinter()],
    });
    try {
      const diags: Diagnostic[] = [
        { from: 0, to: 9, severity: 'error', message: 'parse: unexpected token' },
        { from: 10, to: 16, severity: 'warning', message: 'validate: unknown icon' },
      ];
      pushDiagnostics(view, diags);

      expect(diagnosticCount(view.state)).toBe(2);
      const seen: string[] = [];
      forEachDiagnostic(view.state, (d) => seen.push(d.message));
      expect(seen).toEqual(['parse: unexpected token', 'validate: unknown icon']);
    } finally {
      view.destroy();
    }
  });

  it('clears diagnostics when an empty array is pushed', () => {
    const view = new EditorView({
      doc: 'flowchart',
      parent: document.body,
      extensions: [dslLinter()],
    });
    try {
      pushDiagnostics(view, [{ from: 0, to: 9, severity: 'error', message: 'x' }]);
      expect(diagnosticCount(view.state)).toBe(1);
      pushDiagnostics(view, []);
      expect(diagnosticCount(view.state)).toBe(0);
    } finally {
      view.destroy();
    }
  });
});

describe('pipelineErrorsToDiagnostics', () => {
  const state = EditorState.create({ doc: 'flowchart\nA -> B' }); // line 1: 0-9, line 2: 10-16

  it('maps an error to its line range, prefixing the message with the stage', () => {
    const result = pipelineErrorsToDiagnostics(state, [
      { stage: 'parse', message: 'boom', line: 2, severity: 'error' },
    ]);
    expect(result).toEqual([{ from: 10, to: 16, severity: 'error', message: 'parse: boom' }]);
  });

  it('passes warnings through with severity intact', () => {
    const result = pipelineErrorsToDiagnostics(state, [
      { stage: 'validate', message: 'unknown icon "x"', line: 1, severity: 'warning' },
    ]);
    expect(result[0]).toMatchObject({
      severity: 'warning',
      message: 'validate: unknown icon "x"',
    });
  });

  it('clamps out-of-range line numbers to line 1', () => {
    const result = pipelineErrorsToDiagnostics(state, [
      { stage: 'lex', message: 'bad', line: 99, severity: 'error' },
    ]);
    expect(result[0]).toMatchObject({ from: 0, to: 9 });
  });

  it('clamps errors without a line number to line 1', () => {
    const result = pipelineErrorsToDiagnostics(state, [
      { stage: 'layout', message: 'bad', severity: 'error' },
    ]);
    expect(result[0]).toMatchObject({ from: 0, to: 9 });
  });
});
