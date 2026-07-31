import { create } from 'zustand';
import { generateId } from '@/lib/utils';

export interface DiagramRecord {
  id: string;
  name: string;
  source: string;
}

interface DiagramRegistryState {
  diagrams: Record<string, DiagramRecord>;
  order: string[]; // insertion order, for stable list display
  activeDiagramId: string | null;

  initialize: () => void;
  createDiagram: (name: string, source: string) => string; // returns new id
  renameDiagram: (id: string, name: string) => void;
  updateSource: (id: string, source: string) => void;
  deleteDiagram: (id: string) => void;
  setActiveDiagram: (id: string) => void;
  saveDiagram: (name: string, source: string) => string;
  getDiagram: (id: string) => DiagramRecord | undefined;
}

const DEFAULT_SOURCE = `flowchart

Client [icon: user]
API Gateway
Auth Service
Database [icon: database]

Client > API Gateway: request
API Gateway > Auth Service: validate token
Auth Service > Database: check session
`;

export const useDiagramRegistry = create<DiagramRegistryState>((set, get) => ({
  diagrams: {},
  order: [],
  activeDiagramId: null,

  initialize: () => {
    const state = get();
    if (Object.keys(state.diagrams).length > 0) return; // already initialized
    const initialId = generateId('diagram');
    set({
      diagrams: {
        [initialId]: { id: initialId, name: 'Untitled diagram', source: DEFAULT_SOURCE },
      },
      order: [initialId],
      activeDiagramId: initialId,
    });
  },

  createDiagram: (name, source) => {
    const id = generateId('diagram');
    set((state) => ({
      diagrams: { ...state.diagrams, [id]: { id, name, source } },
      order: [...state.order, id],
      activeDiagramId: id,
    }));
    return id;
  },

  renameDiagram: (id, name) =>
    set((state) => {
      const existing = state.diagrams[id];
      if (!existing) return state;
      return { diagrams: { ...state.diagrams, [id]: { ...existing, name } } };
    }),

  updateSource: (id, source) =>
    set((state) => {
      const existing = state.diagrams[id];
      if (!existing) return state;
      return { diagrams: { ...state.diagrams, [id]: { ...existing, source } } };
    }),

  deleteDiagram: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.diagrams;
      const order = state.order.filter((d) => d !== id);
      const activeDiagramId =
        state.activeDiagramId === id ? (order[0] ?? null) : state.activeDiagramId;
      return { diagrams: rest, order, activeDiagramId };
    }),

  setActiveDiagram: (id) => set({ activeDiagramId: id }),

  saveDiagram: (name, source) => {
    const activeId = get().activeDiagramId;
    if (activeId && get().diagrams[activeId]) {
      get().renameDiagram(activeId, name);
      get().updateSource(activeId, source);
      return activeId;
    } else {
      return get().createDiagram(name, source);
    }
  },

  getDiagram: (id) => get().diagrams[id],
}));

// Convenience selector for the currently active diagram's full record.
export function useActiveDiagram(): DiagramRecord | null {
  return useDiagramRegistry((state) =>
    state.activeDiagramId ? state.diagrams[state.activeDiagramId] ?? null : null
  );
}