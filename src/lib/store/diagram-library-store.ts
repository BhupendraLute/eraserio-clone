import { useMemo } from 'react';
import { useDiagramRegistry, DiagramRecord } from './diagram-registry';

export type SavedDiagram = DiagramRecord;

interface DiagramLibraryState {
  diagrams: SavedDiagram[];
  saveDiagram: (name: string, source: string) => string;
  getDiagram: (id: string) => SavedDiagram | undefined;
  updateDiagramSource: (id: string, source: string) => void;
}

export function useDiagramLibraryStore<T>(
  selector: (state: DiagramLibraryState) => T
): T {
  const order = useDiagramRegistry((s) => s.order);
  const diagramsMap = useDiagramRegistry((s) => s.diagrams);

  const saveDiagram = useDiagramRegistry((s) => s.saveDiagram);
  const getDiagram = useDiagramRegistry((s) => s.getDiagram);
  const updateDiagramSource = useDiagramRegistry((s) => s.updateSource);

  const diagramsList = useMemo(
    () => order.map((id) => diagramsMap[id]).filter((d): d is DiagramRecord => Boolean(d)),
    [order, diagramsMap]
  );

  const libraryState = useMemo(
    () => ({
      diagrams: diagramsList,
      saveDiagram,
      getDiagram,
      updateDiagramSource,
    }),
    [diagramsList, saveDiagram, getDiagram, updateDiagramSource]
  );

  return selector(libraryState);
}

useDiagramLibraryStore.getState = (): DiagramLibraryState => {
  const regState = useDiagramRegistry.getState();
  const diagramsList = regState.order
    .map((id) => regState.diagrams[id])
    .filter((d): d is DiagramRecord => Boolean(d));

  return {
    diagrams: diagramsList,
    saveDiagram: regState.saveDiagram,
    getDiagram: regState.getDiagram,
    updateDiagramSource: regState.updateSource,
  };
};