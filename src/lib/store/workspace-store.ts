import { create } from 'zustand';

export type WorkspaceViewMode = 'document' | 'both' | 'canvas';

export interface DiagramRecord {
  id: string;
  name: string;
  source: string;
}

interface WorkspaceState {
  viewMode: WorkspaceViewMode;
  fileName: string;
  aiChatOpen: boolean;
  diagramCodeOpen: boolean;
  insertItemOpen: boolean;

  diagrams: DiagramRecord[];
  getDiagram: (id: string | null) => DiagramRecord | null;

  setViewMode: (mode: WorkspaceViewMode) => void;
  setFileName: (name: string) => void;
  setAiChatOpen: (open: boolean) => void;
  toggleAiChat: () => void;
  setDiagramCodeOpen: (open: boolean) => void;
  toggleDiagramCode: () => void;
  setInsertItemOpen: (open: boolean) => void;
  toggleInsertItem: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  viewMode: 'both',
  fileName: 'Untitled File',
  aiChatOpen: false,
  diagramCodeOpen: false,
  insertItemOpen: false,

  diagrams: [
    {
      id: 'demo-1',
      name: 'Architecture Diagram',
      source: 'sequenceDiagram\n  Client->>Server: HTTP GET /api\n  Server-->>Client: 200 OK',
    },
  ],

  getDiagram: (id) => {
    if (!id) return null;
    return get().diagrams.find((d) => d.id === id) || null;
  },

  setViewMode: (viewMode) => set({ viewMode }),
  setFileName: (fileName) => set({ fileName }),
  setAiChatOpen: (aiChatOpen) => set({ aiChatOpen }),
  toggleAiChat: () => set((s) => ({ aiChatOpen: !s.aiChatOpen })),
  setDiagramCodeOpen: (diagramCodeOpen) => set({ diagramCodeOpen }),
  toggleDiagramCode: () => set((s) => ({ diagramCodeOpen: !s.diagramCodeOpen })),
  setInsertItemOpen: (insertItemOpen) => set({ insertItemOpen }),
  toggleInsertItem: () => set((s) => ({ insertItemOpen: !s.insertItemOpen })),
}));
