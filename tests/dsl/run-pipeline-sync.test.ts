import { describe, expect, it } from 'vitest';
import { runPipelineSync } from '@/lib/dsl/run-pipeline-sync';

describe('runPipelineSync', () => {
  it('lays out a valid flowchart with positioned nodes and routed edges', () => {
    const result = runPipelineSync('flowchart\nA --> B\nB > C: data');
    expect(result.ok).toBe(true);    // Narrow the discriminated union so `nodes`/`edges` are accessible,
    // and throw (not return) so a wrong-kind regression fails loudly.
    if (!result.ok || result.kind !== 'flowchart') {
      throw new Error('Expected a flowchart pipeline result');
    }

    expect(result.nodes).toHaveLength(3);
    for (const node of result.nodes) {
      expect(typeof node.x).toBe('number');
      expect(typeof node.y).toBe('number');
      expect(typeof node.width).toBe('number');
      expect(typeof node.height).toBe('number');
      expect(Array.isArray(node.lines)).toBe(true);
    }
    expect(result.edges).toHaveLength(2);
    expect(result.edges[0].points.length).toBeGreaterThan(0);
  });

  it('lays out a sequence diagram with actors and messages', () => {
    const result = runPipelineSync(
      'sequence-diagram\nUser\nAPI\nUser --> API: request'
    );
    expect(result.ok).toBe(true);    // Narrow the discriminated union so `actors`/`messages` are accessible,
    // and throw (not return) so a wrong-kind regression fails loudly.
    if (!result.ok || result.kind !== 'sequence') {
      throw new Error('Expected a sequence pipeline result');
    }

    expect(result.actors.map((a) => a.id)).toEqual(['User', 'API']);
    expect(result.actors[0]).toMatchObject({ label: 'User' });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      from: 'User',
      to: 'API',
      label: 'request',
      arrowType: 'async',
    });
    expect(typeof result.width).toBe('number');
    expect(typeof result.height).toBe('number');
  });

  it('rejects an unknown diagram type with the validator message', () => {
    expect(runPipelineSync('banana\nA')).toEqual({
      ok: false,
      message: "Unknown diagram type. First line must be 'flowchart' or 'sequence-diagram'.",
    });
  });

  it('rejects source with a syntax error', () => {
    expect(runPipelineSync('flowchart\nA >')).toEqual({
      ok: false,
      message: 'Diagram has a syntax error.',
    });
  });

  it('rejects empty source', () => {
    expect(runPipelineSync('')).toEqual({
      ok: false,
      message: 'Diagram has a syntax error.',
    });
  });

  it('still renders when only warnings exist (unknown icon)', () => {
    const result = runPipelineSync('flowchart\nA [icon: nope]');
    expect(result.ok).toBe(true);
  });
});
