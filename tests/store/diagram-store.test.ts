import { beforeEach, describe, expect, it } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { useDiagramStore } from '@/lib/store/diagram-store';
import type { LaidOutNode, LaidOutEdge } from '@/lib/layout/types';
import type { PipelineError, PipelineDiagramResult } from '@/workers/pipeline.worker';

function node(id: string, x = 0, y = 0, width = 100, height = 60): LaidOutNode {
  return { id, label: id, attrs: {}, x, y, width, height, lines: [] };
}

function edge(from: string, to: string): LaidOutEdge {
  return { from, to, points: [{ x: 0, y: 0 }, { x: 120, y: 120 }] };
}

function flowchartResult(nodes: LaidOutNode[], edges: LaidOutEdge[]): PipelineDiagramResult {
  return { kind: 'flowchart', nodes, edges };
}

function sequenceResult(): PipelineDiagramResult {
  return {
    kind: 'sequence',
    actors: [
      { id: 'A', label: 'A', x: 20, width: 80 },
      { id: 'B', label: 'B', x: 140, width: 80 },
    ],
    messages: [{ from: 'A', to: 'B', label: 'ping', arrowType: 'sync', y: 80 }],
    width: 300,
    height: 150,
  };
}

const warning: PipelineError = { stage: 'validate', message: 'minor warning', severity: 'warning' };

const initialState = useDiagramStore.getState();

beforeEach(() => {
  useDiagramStore.setState(initialState);
});

describe('useDiagramStore defaults', () => {
  it('starts with the default source and an idle pipeline', () => {
    const s = useDiagramStore.getState();
    expect(s.source).toContain('flowchart');
    expect(s.status).toBe('idle');
    expect(s.diagramKind).toBeNull();
    expect(s.currentDiagramId).toBeNull();
    expect(s.nodes).toEqual([]);
    expect(s.edges).toEqual([]);
    expect(s.nodeOverrides).toEqual({});
    expect(s.errors).toEqual([]);
  });
});

describe('setSource', () => {
  it('updates the source text', () => {
    useDiagramStore.getState().setSource('flowchart\nA');
    expect(useDiagramStore.getState().source).toBe('flowchart\nA');
  });
});

describe('loadDiagram', () => {
  it('switches to another diagram and resets per-diagram state', () => {
    // Seed state that must not bleed into the next diagram.
    useDiagramStore.setState({
      currentDiagramId: 'old',
      diagramKind: 'flowchart',
      nodeOverrides: { A: { x: 500, y: 500 } },
      nodes: [node('A', 500, 500)],
      rawNodes: [node('A')],
      edges: [edge('A', 'B')],
      sequenceActors: [{ id: 'X', label: 'X', x: 0, width: 10 }],
      sequenceMessages: [{ from: 'X', to: 'Y', arrowType: 'sync', y: 10 }],
      errors: [{ stage: 'lex', message: 'boom', severity: 'error' }],
      status: 'error',
    });

    useDiagramStore.getState().loadDiagram('new-id', 'sequence-diagram\nA -> B');

    const s = useDiagramStore.getState();
    expect(s.currentDiagramId).toBe('new-id');
    expect(s.source).toBe('sequence-diagram\nA -> B');
    expect(s.nodeOverrides).toEqual({});
    expect(s.nodes).toEqual([]);
    expect(s.rawNodes).toEqual([]);
    expect(s.edges).toEqual([]);
    expect(s.sequenceActors).toEqual([]);
    expect(s.sequenceMessages).toEqual([]);
    expect(s.errors).toEqual([]);
    expect(s.status).toBe('idle');
  });
});

describe('applyResult (flowchart)', () => {
  it('stores nodes/edges and re-applies manual overrides', () => {
    useDiagramStore.setState({ nodeOverrides: { B: { x: 500, y: 500 } } });
    useDiagramStore
      .getState()
      .applyResult(flowchartResult([node('A'), node('B', 10, 10)], [edge('A', 'B')]), [warning]);

    const s = useDiagramStore.getState();
    expect(s.diagramKind).toBe('flowchart');
    expect(s.status).toBe('ok');
    expect(s.edges).toEqual([edge('A', 'B')]);
    // rawNodes keep the layout output...
    expect(s.rawNodes).toEqual([node('A'), node('B', 10, 10)]);
    // ...while the overridden node keeps its dragged position in `nodes`.
    const b = s.nodes.find((n) => n.id === 'B');
    expect(b).toMatchObject({ x: 500, y: 500 });
    const a = s.nodes.find((n) => n.id === 'A');
    expect(a).toMatchObject({ x: 0, y: 0 });
    expect(s.errors).toEqual([warning]);
  });

  it('passes nodes through unchanged when there are no overrides', () => {
    useDiagramStore.getState().applyResult(flowchartResult([node('A'), node('B')], []), []);
    const s = useDiagramStore.getState();
    expect(s.nodes).toEqual([node('A'), node('B')]);
    expect(s.rawNodes).toEqual([node('A'), node('B')]);
  });
});

describe('applyResult (sequence)', () => {
  it('stores the sequence layout output', () => {
    useDiagramStore.getState().applyResult(sequenceResult(), []);

    const s = useDiagramStore.getState();
    expect(s.diagramKind).toBe('sequence');
    expect(s.status).toBe('ok');
    expect(s.sequenceActors).toHaveLength(2);
    expect(s.sequenceMessages[0]).toMatchObject({ label: 'ping', y: 80 });
    expect(s.sequenceWidth).toBe(300);
    expect(s.sequenceHeight).toBe(150);
  });
});

describe('pipeline status helpers', () => {
  it('setErrors marks the pipeline as errored', () => {
    const errs: PipelineError[] = [{ stage: 'parse', message: 'syntax', severity: 'error' }];
    useDiagramStore.getState().setErrors(errs);
    const s = useDiagramStore.getState();
    expect(s.errors).toEqual(errs);
    expect(s.status).toBe('error');
  });

  it('setPending marks the pipeline as in flight', () => {
    useDiagramStore.getState().setPending();
    expect(useDiagramStore.getState().status).toBe('pending');
  });
});

describe('editor / svg references', () => {
  it('setEditorView stores the view', () => {
    const view = { requestMeasure: () => {} } as unknown as EditorView;
    useDiagramStore.getState().setEditorView(view);
    expect(useDiagramStore.getState().editorView).toBe(view);
  });

  it('setSvgElement stores the svg element', () => {
    const el = { tagName: 'svg' } as unknown as SVGSVGElement;
    useDiagramStore.getState().setSvgElement(el);
    expect(useDiagramStore.getState().svgElement).toBe(el);
  });
});

describe('node position overrides', () => {
  it('setNodePosition records the override and moves the node', () => {
    useDiagramStore.setState({ nodes: [node('A'), node('B')] });
    useDiagramStore.getState().setNodePosition('B', 300, 150);

    const s = useDiagramStore.getState();
    expect(s.nodeOverrides).toEqual({ B: { x: 300, y: 150 } });
    expect(s.nodes.find((n) => n.id === 'B')).toMatchObject({ x: 300, y: 150 });
    expect(s.nodes.find((n) => n.id === 'A')).toMatchObject({ x: 0, y: 0 });
  });

  it('setNodePosition still records an override for an unknown node', () => {
    useDiagramStore.getState().setNodePosition('Ghost', 5, 5);
    const s = useDiagramStore.getState();
    expect(s.nodeOverrides).toEqual({ Ghost: { x: 5, y: 5 } });
    expect(s.nodes).toEqual([]);
  });

  it('resetNodePosition restores the raw layout coordinates', () => {
    useDiagramStore.setState({
      rawNodes: [node('A'), node('B', 40, 40)],
      nodes: [node('A'), node('B', 40, 40)],
    });
    useDiagramStore.getState().setNodePosition('B', 300, 150);
    useDiagramStore.getState().resetNodePosition('B');

    const s = useDiagramStore.getState();
    expect(s.nodeOverrides).toEqual({});
    expect(s.nodes.find((n) => n.id === 'B')).toMatchObject({ x: 40, y: 40 });
  });

  it('resetNodePosition leaves an override-less node alone', () => {
    // nodes[] mirrors applyResult output: the override position is baked in.
    useDiagramStore.setState({
      rawNodes: [node('A')],
      nodes: [node('A', 10, 10)],
      nodeOverrides: { A: { x: 10, y: 10 } },
    });
    useDiagramStore.getState().resetNodePosition('Missing');

    const s = useDiagramStore.getState();
    expect(s.nodeOverrides).toEqual({ A: { x: 10, y: 10 } });
    expect(s.nodes[0]).toMatchObject({ x: 10, y: 10 });
  });
});
