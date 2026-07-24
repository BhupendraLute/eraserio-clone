import { create } from 'zustand';

export interface SavedDiagram {
  id: string;
  name: string;
  source: string;
}

interface DiagramLibraryState {
  diagrams: SavedDiagram[];
  saveDiagram: (name: string, source: string) => string; // returns new id
  getDiagram: (id: string) => SavedDiagram | undefined;
  updateDiagramSource: (id: string, source: string) => void;
}

export const useDiagramLibraryStore = create<DiagramLibraryState>((set, get) => ({
  diagrams: [],

  saveDiagram: (name, source) => {
    const id = crypto.randomUUID();
    set((state) => ({ diagrams: [...state.diagrams, { id, name, source }] }));
    return id;
  },

  getDiagram: (id) => get().diagrams.find((d) => d.id === id),

  updateDiagramSource: (id, source) =>
    set((state) => ({
      diagrams: state.diagrams.map((d) => (d.id === id ? { ...d, source } : d)),
    })),
}));