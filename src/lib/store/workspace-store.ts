import { create } from 'zustand';

export type WorkspaceViewMode = 'document' | 'both' | 'canvas';
export type WorkspaceTab = 'whiteboard' | 'code' | 'docs';

interface WorkspaceState {
  viewMode: WorkspaceViewMode;
  activeTab: WorkspaceTab;
  fileName: string;
  aiChatOpen: boolean;
  diagramCodeOpen: boolean;
  insertItemOpen: boolean;

  setViewMode: (mode: WorkspaceViewMode) => void;
  setActiveTab: (tab: WorkspaceTab) => void;
  setFileName: (name: string) => void;
  setAiChatOpen: (open: boolean) => void;
  toggleAiChat: () => void;
  setDiagramCodeOpen: (open: boolean) => void;
  toggleDiagramCode: () => void;
  setInsertItemOpen: (open: boolean) => void;
  toggleInsertItem: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  viewMode: 'both',
  activeTab: 'whiteboard',
  fileName: 'Untitled File',
  aiChatOpen: false,
  diagramCodeOpen: false,
  insertItemOpen: false,

  setViewMode: (viewMode) => set({ viewMode }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setFileName: (fileName) => set({ fileName }),
  setAiChatOpen: (aiChatOpen) => set({ aiChatOpen }),
  toggleAiChat: () => set((s) => ({ aiChatOpen: !s.aiChatOpen })),
  setDiagramCodeOpen: (diagramCodeOpen) => set({ diagramCodeOpen }),
  toggleDiagramCode: () => set((s) => ({ diagramCodeOpen: !s.diagramCodeOpen })),
  setInsertItemOpen: (insertItemOpen) => set({ insertItemOpen }),
  toggleInsertItem: () => set((s) => ({ insertItemOpen: !s.insertItemOpen })),
}));
