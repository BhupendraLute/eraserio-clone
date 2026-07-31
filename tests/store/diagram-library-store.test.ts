import { beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { useDiagramLibraryStore } from '@/lib/store/diagram-library-store';

const initialState = useDiagramRegistry.getState();

beforeEach(() => {
  useDiagramRegistry.setState(initialState);
});

describe('useDiagramLibraryStore.getState (non-hook accessor)', () => {
  it('starts with an empty list before the registry is initialized', () => {
    expect(useDiagramLibraryStore.getState().diagrams).toEqual([]);
  });

  it('derives the diagrams list in registry order', () => {
    useDiagramRegistry.getState().initialize();
    useDiagramRegistry.getState().createDiagram('B', 'flowchart\nB');
    useDiagramRegistry.getState().createDiagram('C', 'flowchart\nC');

    const list = useDiagramLibraryStore.getState().diagrams;
    expect(list.map((d) => d.id)).toEqual(useDiagramRegistry.getState().order);
    expect(list[0]).toMatchObject({ name: 'Untitled diagram' });
  });

  it('filters out order ids that no longer resolve to a record', () => {
    useDiagramRegistry.setState({
      order: ['ghost-id', 'real-id'],
      diagrams: { 'real-id': { id: 'real-id', name: 'R', source: 'flowchart\nR' } },
    });
    expect(useDiagramLibraryStore.getState().diagrams.map((d) => d.id)).toEqual(['real-id']);
  });

  it('saveDiagram delegates to the registry and updates the list', () => {
    const id = useDiagramLibraryStore.getState().saveDiagram('D', 'flowchart\nD');
    expect(useDiagramLibraryStore.getState().diagrams).toHaveLength(1);
    expect(useDiagramLibraryStore.getState().diagrams[0]).toMatchObject({ id, name: 'D' });
  });

  it('updateDiagramSource keeps the list in sync', () => {
    const id = useDiagramLibraryStore.getState().saveDiagram('D', 'flowchart\nD');
    useDiagramLibraryStore.getState().updateDiagramSource(id, 'sequence-diagram\nX -> Y');
    expect(useDiagramLibraryStore.getState().diagrams[0].source).toBe('sequence-diagram\nX -> Y');
  });

  it('getDiagram looks up a single record', () => {
    const id = useDiagramLibraryStore.getState().saveDiagram('D', 'flowchart\nD');
    expect(useDiagramLibraryStore.getState().getDiagram(id)?.name).toBe('D');
    expect(useDiagramLibraryStore.getState().getDiagram('missing')).toBeUndefined();
  });
});

describe('useDiagramLibraryStore hook', () => {
  // The hook needs a React render context; during SSR, zustand falls back to
  // the registry's initial state (empty), which exercises the selector + the
  // empty-list derivation. The data-bearing path is covered by getState().
  it('selects the derived state in a render', () => {
    function Probe() {
      const count = useDiagramLibraryStore((s) => s.diagrams.length);
      return createElement('span', null, `count:${count}`);
    }
    expect(renderToStaticMarkup(createElement(Probe))).toContain('count:0');
  });
});
