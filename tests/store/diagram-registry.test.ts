import { beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useDiagramRegistry, useActiveDiagram } from '@/lib/store/diagram-registry';

const initialState = useDiagramRegistry.getState();

beforeEach(() => {
  useDiagramRegistry.setState(initialState);
});

describe('initialize', () => {
  it('seeds a single default diagram on first run', () => {
    useDiagramRegistry.getState().initialize();

    const s = useDiagramRegistry.getState();
    expect(s.order).toHaveLength(1);
    const id = s.order[0];
    expect(id).toMatch(/^diagram-/);
    expect(s.diagrams[id]).toMatchObject({ name: 'Untitled diagram' });
    expect(s.diagrams[id].source).toContain('flowchart');
    expect(s.activeDiagramId).toBe(id);
  });

  it('is a no-op once already initialized', () => {
    useDiagramRegistry.getState().initialize();
    useDiagramRegistry.getState().initialize();
    expect(useDiagramRegistry.getState().order).toHaveLength(1);
  });
});

describe('CRUD', () => {
  it('createDiagram adds a record, activates it, and returns its id', () => {
    const id = useDiagramRegistry.getState().createDiagram('My diagram', 'flowchart\nA');

    const s = useDiagramRegistry.getState();
    expect(id).toMatch(/^diagram-/);
    expect(s.diagrams[id]).toEqual({ id, name: 'My diagram', source: 'flowchart\nA' });
    expect(s.order).toEqual([id]);
    expect(s.activeDiagramId).toBe(id);
  });

  it('renameDiagram only changes the name', () => {
    const id = useDiagramRegistry.getState().createDiagram('Old', 'flowchart\nA');
    useDiagramRegistry.getState().renameDiagram(id, 'New');
    expect(useDiagramRegistry.getState().diagrams[id]).toMatchObject({
      name: 'New',
      source: 'flowchart\nA',
    });
  });

  it('renameDiagram is a no-op for an unknown id', () => {
    useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    const before = useDiagramRegistry.getState().diagrams;
    useDiagramRegistry.getState().renameDiagram('nope', 'X');
    expect(useDiagramRegistry.getState().diagrams).toBe(before);
  });

  it('updateSource saves the latest source', () => {
    const id = useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    useDiagramRegistry.getState().updateSource(id, 'sequence-diagram\nX -> Y');
    expect(useDiagramRegistry.getState().diagrams[id]).toMatchObject({
      name: 'A',
      source: 'sequence-diagram\nX -> Y',
    });
  });

  it('updateSource is a no-op for an unknown id', () => {
    useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    const before = useDiagramRegistry.getState().diagrams;
    useDiagramRegistry.getState().updateSource('nope', 'x');
    expect(useDiagramRegistry.getState().diagrams).toBe(before);
  });

  it('getDiagram returns the record or undefined', () => {
    const id = useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    expect(useDiagramRegistry.getState().getDiagram(id)?.name).toBe('A');
    expect(useDiagramRegistry.getState().getDiagram('missing')).toBeUndefined();
  });
});

describe('active diagram handling', () => {
  it('setActiveDiagram marks the id active', () => {
    useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    const idB = useDiagramRegistry.getState().createDiagram('B', 'flowchart\nB');
    useDiagramRegistry.getState().setActiveDiagram(idB);
    expect(useDiagramRegistry.getState().activeDiagramId).toBe(idB);
  });

  it('deleteDiagram moves the active id to the first remaining record', () => {
    const idA = useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    useDiagramRegistry.getState().createDiagram('B', 'flowchart\nB');
    useDiagramRegistry.getState().setActiveDiagram(idA);

    useDiagramRegistry.getState().deleteDiagram(idA);

    const s = useDiagramRegistry.getState();
    expect(s.diagrams[idA]).toBeUndefined();
    expect(s.order).toHaveLength(1);
    expect(s.activeDiagramId).toBe(s.order[0]);
  });

  it('deleteDiagram leaves the active id untouched when deleting another', () => {
    const idA = useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    const idB = useDiagramRegistry.getState().createDiagram('B', 'flowchart\nB');
    useDiagramRegistry.getState().setActiveDiagram(idA);

    useDiagramRegistry.getState().deleteDiagram(idB);

    const s = useDiagramRegistry.getState();
    expect(s.diagrams[idB]).toBeUndefined();
    expect(s.activeDiagramId).toBe(idA);
  });

  it('deleteDiagram clears the active id when the last record is removed', () => {
    const id = useDiagramRegistry.getState().createDiagram('A', 'flowchart\nA');
    useDiagramRegistry.getState().deleteDiagram(id);
    expect(useDiagramRegistry.getState().activeDiagramId).toBeNull();
  });
});

describe('saveDiagram', () => {
  it('updates the active record in place when one exists', () => {
    const id = useDiagramRegistry.getState().createDiagram('Old', 'flowchart\nA');
    const returned = useDiagramRegistry.getState().saveDiagram('Renamed', 'flowchart\nB');

    expect(returned).toBe(id);
    const s = useDiagramRegistry.getState();
    expect(s.order).toHaveLength(1);
    expect(s.diagrams[id]).toMatchObject({ name: 'Renamed', source: 'flowchart\nB' });
  });

  it('creates a new record when nothing is active', () => {
    useDiagramRegistry.setState({ activeDiagramId: null });
    const id = useDiagramRegistry.getState().saveDiagram('New', 'flowchart\nC');

    expect(id).toMatch(/^diagram-/);
    const s = useDiagramRegistry.getState();
    expect(s.diagrams[id]).toMatchObject({ name: 'New', source: 'flowchart\nC' });
    expect(s.activeDiagramId).toBe(id);
  });
});

describe('useActiveDiagram', () => {
  // useActiveDiagram is a React hook, so it's exercised through a server
  // render. Note: during SSR, zustand's useStore falls back to the store's
  // initial state, so this probes the no-active-id branch (the default).
  it('returns null when no diagram is active', () => {
    function Probe() {
      const active = useActiveDiagram();
      return createElement('span', null, active ? 'has-active' : 'no-active');
    }
    expect(renderToStaticMarkup(createElement(Probe))).toContain('no-active');
  });
});
