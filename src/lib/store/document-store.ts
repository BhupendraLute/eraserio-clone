import { create } from 'zustand';
import { useWhiteboardStore } from './whiteboard-store';
import { useDiagramRegistry } from './diagram-registry';
import { generateId } from '@/lib/utils';

export interface DocumentMetadata {
  id: string;
  title: string;
  isPublic: boolean;
  shareToken?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SyncStatus = 'synced' | 'saving' | 'offline' | 'error';

interface DocumentStoreState {
  documents: DocumentMetadata[];
  activeDocumentId: string | null;
  activeDocumentTitle: string;
  syncStatus: SyncStatus;
  isPublic: boolean;
  shareToken: string | null;
  mode: 'cloud' | 'offline';

  fetchDocuments: () => Promise<void>;
  createDocument: (title?: string) => Promise<string>;
  selectDocument: (id: string) => Promise<void>;
  renameDocument: (id: string, newTitle: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  saveCurrentDocumentState: (data: {
    whiteboardData?: unknown;
    diagramSource?: string;
    docContent?: string;
  }) => void;
  togglePublicShare: (isPublic: boolean) => Promise<{ shareUrl: string | null }>;
}

let _saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  documents: [],
  activeDocumentId: null,
  activeDocumentTitle: 'Untitled Document',
  syncStatus: 'synced',
  isPublic: false,
  shareToken: null,
  mode: 'offline',

  fetchDocuments: async () => {
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const docs: DocumentMetadata[] = data.documents || [];
      const mode = data.mode || 'offline';

      set({ documents: docs, mode });

      if (docs.length > 0 && !get().activeDocumentId) {
        await get().selectDocument(docs[0].id);
      }
    } catch {
      set({ mode: 'offline' });
    }
  },

  createDocument: async (title = 'Untitled Document') => {
    set({ syncStatus: 'saving' });
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      const doc = data.document;
      const newId = doc?.id || generateId('doc');

      const newMeta: DocumentMetadata = {
        id: newId,
        title: doc?.title || title,
        isPublic: false,
        shareToken: null,
        createdAt: doc?.createdAt || new Date().toISOString(),
        updatedAt: doc?.updatedAt || new Date().toISOString(),
      };

      set((state) => ({
        documents: [newMeta, ...state.documents],
        activeDocumentId: newId,
        activeDocumentTitle: newMeta.title,
        syncStatus: 'synced',
        isPublic: false,
        shareToken: null,
      }));

      // Initialize empty canvas and diagram for new doc
      useWhiteboardStore.setState({ elements: [] });
      const reg = useDiagramRegistry.getState();
      reg.createDiagram(newMeta.title, 'flowchart\n\nNodeA > NodeB: connect\n');

      return newId;
    } catch {
      set({ syncStatus: 'error' });
      return generateId('doc');
    }
  },

  selectDocument: async (id: string) => {
    set({ activeDocumentId: id, syncStatus: 'saving' });
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const { document: doc } = await res.json();
        if (doc) {
          set({
            activeDocumentTitle: doc.title,
            isPublic: doc.isPublic,
            shareToken: doc.shareToken,
            syncStatus: 'synced',
          });

          // Hydrate Whiteboard Elements
          if (doc.whiteboardData) {
            try {
              const elements =
                typeof doc.whiteboardData === 'string'
                  ? JSON.parse(doc.whiteboardData)
                  : doc.whiteboardData;
              useWhiteboardStore.setState({ elements });
            } catch {
              // ignore parse errors
            }
          }

          // Hydrate Diagram Source
          if (doc.diagramSource) {
            const reg = useDiagramRegistry.getState();
            reg.updateSource(reg.activeDiagramId || 'default', doc.diagramSource);
          }
          return;
        }
      }
    } catch {
      // offline fallback
    }

    // Fallback if offline or missing
    const existing = get().documents.find((d) => d.id === id);
    if (existing) {
      set({ activeDocumentTitle: existing.title, syncStatus: 'synced' });
    }
  },

  renameDocument: async (id: string, newTitle: string) => {
    set((state) => ({
      activeDocumentTitle: state.activeDocumentId === id ? newTitle : state.activeDocumentTitle,
      documents: state.documents.map((d) => (d.id === id ? { ...d, title: newTitle } : d)),
      syncStatus: 'saving',
    }));

    try {
      await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      set({ syncStatus: 'synced' });
    } catch {
      set({ syncStatus: 'error' });
    }
  },

  deleteDocument: async (id: string) => {
    set((state) => {
      const updated = state.documents.filter((d) => d.id !== id);
      const nextActive = state.activeDocumentId === id ? (updated[0]?.id ?? null) : state.activeDocumentId;
      return { documents: updated, activeDocumentId: nextActive };
    });

    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    } catch {
      // ignore offline delete error
    }
  },

  saveCurrentDocumentState: (data) => {
    const activeId = get().activeDocumentId;
    if (!activeId) return;

    set({ syncStatus: 'saving' });

    if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(async () => {
      try {
        await fetch(`/api/documents/${activeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'error' });
      }
    }, 500);
  },

  togglePublicShare: async (isPublic: boolean) => {
    const activeId = get().activeDocumentId;
    if (!activeId) return { shareUrl: null };

    try {
      const res = await fetch(`/api/documents/${activeId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      const data = await res.json();
      set({ isPublic: data.isPublic, shareToken: data.shareToken });
      return { shareUrl: data.shareUrl };
    } catch {
      return { shareUrl: null };
    }
  },
}));
