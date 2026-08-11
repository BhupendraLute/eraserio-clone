import { create } from 'zustand';
import { useWhiteboardStore } from './whiteboard-store';
import { useDiagramRegistry } from './diagram-registry';
import { useDiagramStore } from './diagram-store';
import { generateId } from '@/lib/utils';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface DashboardFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  isPublic: boolean;
  shareToken?: string | null;
  createdAt: string;
  updatedAt: string;
  whiteboardData?: string;
  diagramSource?: string;
  docContent?: string;
  folderId?: string | null;
  isArchived?: boolean;
  isPrivate?: boolean;
  commentsCount?: number;
}

export type SyncStatus = 'synced' | 'saving' | 'offline' | 'error';

interface DocumentStoreState {
  documents: DocumentMetadata[];
  folders: DashboardFolder[];
  activeDocumentId: string | null;
  activeDocumentTitle: string;
  syncStatus: SyncStatus;
  isPublic: boolean;
  shareToken: string | null;
  mode: 'cloud' | 'offline';
  authStatus: AuthStatus;
  hasPendingGuestDocs: boolean;

  setAuthStatus: (status: AuthStatus) => void;
  fetchDocuments: () => Promise<void>;
  createDocument: (title?: string, initialDiagram?: string) => Promise<string>;
  duplicateDocument: (id: string) => Promise<string | null>;
  selectDocument: (id: string) => Promise<void>;
  renameDocument: (id: string, newTitle: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  archiveDocument: (id: string, archive?: boolean) => Promise<void>;
  createFolder: (name: string) => string;
  deleteFolder: (folderId: string) => void;
  moveDocumentToFolder: (docId: string, folderId: string | null) => void;
  saveCurrentDocumentState: (data: {
    whiteboardData?: unknown;
    diagramSource?: string;
    docContent?: string;
  }) => void;
  togglePublicShare: (isPublic: boolean) => Promise<{ success: boolean; shareUrl: string | null }>;
  checkGuestDocuments: () => boolean;
  importGuestDocuments: () => Promise<boolean>;
  clearGuestDocuments: () => void;
}


let _saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const GUEST_DOCS_KEY = 'eraserio_guest_docs';

function getStoredGuestDocs(): DocumentMetadata[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStoredGuestDocs(docs: DocumentMetadata[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_DOCS_KEY, JSON.stringify(docs));
  } catch {
    // quota exceeded or SSR
  }
}

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  documents: [],
  folders: [
    { id: 'f-architecture', name: 'Architecture System', createdAt: new Date().toISOString() },
    { id: 'f-designs', name: 'UI / Wireframes', createdAt: new Date().toISOString() },
  ],
  activeDocumentId: null,
  activeDocumentTitle: 'Untitled Document',
  syncStatus: 'synced',
  isPublic: false,
  shareToken: null,
  mode: 'offline',
  authStatus: 'loading',
  hasPendingGuestDocs: false,

  setAuthStatus: (authStatus) => {
    const prev = get().authStatus;
    set({ authStatus });

    if (prev !== authStatus) {
      void get().fetchDocuments();
      if (authStatus === 'authenticated') {
        get().checkGuestDocuments();
      }
    }
  },

  checkGuestDocuments: () => {
    const guestDocs = getStoredGuestDocs();
    const hasDocs = guestDocs.length > 0;
    set({ hasPendingGuestDocs: hasDocs });
    return hasDocs;
  },

  importGuestDocuments: async () => {
    const guestDocs = getStoredGuestDocs();
    if (guestDocs.length === 0) return false;

    set({ syncStatus: 'saving' });
    try {
      const res = await fetch('/api/documents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: guestDocs }),
      });

      if (!res.ok) throw new Error('Import failed');

      // Purge local storage guest documents immediately upon successful import
      localStorage.removeItem(GUEST_DOCS_KEY);
      set({ hasPendingGuestDocs: false, syncStatus: 'synced' });

      // Refresh the cloud document list
      await get().fetchDocuments();
      return true;
    } catch {
      set({ syncStatus: 'error' });
      return false;
    }
  },

  clearGuestDocuments: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_DOCS_KEY);
    }
    set({ hasPendingGuestDocs: false });
  },

  fetchDocuments: async () => {
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const docs: DocumentMetadata[] = data.documents || [];
      const mode = data.mode || 'offline';

      const currentId = get().activeDocumentId;
      const stillExists = currentId ? docs.some((d) => d.id === currentId) : false;

      set({
        documents: docs,
        mode,
        ...(currentId && !stillExists ? { activeDocumentId: null } : {}),
      });

      if (docs.length > 0 && !get().activeDocumentId) {
        await get().selectDocument(docs[0].id);
      }
    } catch {
      set({ mode: 'offline' });
    }
  },

  createDocument: async (title = 'Untitled Document', initialDiagram?: string) => {
    set({ syncStatus: 'saving' });

    // Clean slate canvas & diagram for new document
    useWhiteboardStore.getState().resetCanvas();
    const diagramContent = initialDiagram || 'flowchart\n\nNodeA > NodeB: connect\n';

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, diagramSource: diagramContent, whiteboardData: '[]' }),
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
        whiteboardData: '[]',
        diagramSource: diagramContent,
        isArchived: false,
        commentsCount: 0,
      };

      set((state) => ({
        documents: [newMeta, ...state.documents],
        activeDocumentId: newId,
        activeDocumentTitle: newMeta.title,
        syncStatus: 'synced',
        isPublic: false,
        shareToken: null,
      }));

      // If in offline guest mode, save to localStorage
      if (get().mode === 'offline') {
        const currentGuestDocs = getStoredGuestDocs();
        setStoredGuestDocs([newMeta, ...currentGuestDocs]);
      }

      // Initialize diagram registry & diagram store for new doc
      const reg = useDiagramRegistry.getState();
      reg.createDiagram(newMeta.title, diagramContent);
      useDiagramStore.getState().setSource(diagramContent);

      return newId;
    } catch {
      set({ syncStatus: 'error' });
      return generateId('doc');
    }
  },

  archiveDocument: async (id: string, archive = true) => {
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, isArchived: archive } : d)),
    }));
  },

  createFolder: (name: string) => {
    const newFolder: DashboardFolder = {
      id: generateId('folder'),
      name,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      folders: [...state.folders, newFolder],
    }));
    return newFolder.id;
  },

  deleteFolder: (folderId: string) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== folderId),
      documents: state.documents.map((d) => (d.folderId === folderId ? { ...d, folderId: null } : d)),
    }));
  },

  moveDocumentToFolder: (docId: string, folderId: string | null) => {
    set((state) => ({
      documents: state.documents.map((d) => (d.id === docId ? { ...d, folderId } : d)),
    }));
  },

  duplicateDocument: async (id: string) => {
    set({ syncStatus: 'saving' });
    try {
      const res = await fetch(`/api/documents/${id}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to duplicate');
      const data = await res.json();
      const duplicated = data.document;

      if (duplicated) {
        const newMeta: DocumentMetadata = {
          id: duplicated.id,
          title: duplicated.title,
          isPublic: false,
          shareToken: null,
          createdAt: duplicated.createdAt,
          updatedAt: duplicated.updatedAt,
        };

        set((state) => ({
          documents: [newMeta, ...state.documents],
          syncStatus: 'synced',
        }));

        await get().selectDocument(duplicated.id);
        return duplicated.id;
      }

      // Nothing was duplicated — return to idle instead of leaving the UI
      // stuck on 'saving'.
      set({ syncStatus: 'synced' });
      return null;
    } catch {
      set({ syncStatus: 'error' });
      return null;
    }
  },

  selectDocument: async (id: string) => {
    if (_saveDebounceTimer) {
      clearTimeout(_saveDebounceTimer);
      _saveDebounceTimer = null;
    }

    // Always reset canvas elements, selection, and undo/redo stacks when switching documents
    useWhiteboardStore.getState().resetCanvas();
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

          // Hydrate Whiteboard Elements for this specific document
          const elements = doc.whiteboardData
            ? (typeof doc.whiteboardData === 'string' ? JSON.parse(doc.whiteboardData) : doc.whiteboardData)
            : [];
          useWhiteboardStore.setState({ elements, selectedIds: [], history: [], future: [] });

          // Hydrate Diagram Source for this specific document
          const diagramSource = doc.diagramSource || '';
          const reg = useDiagramRegistry.getState();
          reg.updateSource(reg.activeDiagramId || 'default', diagramSource);
          useDiagramStore.getState().setSource(diagramSource);
          return;
        }
      }
    } catch {
      // offline fallback
    }

    // Offline / Guest fallback
    const guestDocs = getStoredGuestDocs();
    const existing = guestDocs.find((d) => d.id === id) || get().documents.find((d) => d.id === id);
    if (existing) {
      set({ activeDocumentTitle: existing.title, syncStatus: 'synced' });

      const elements = existing.whiteboardData
        ? (typeof existing.whiteboardData === 'string' ? JSON.parse(existing.whiteboardData) : existing.whiteboardData)
        : [];
      useWhiteboardStore.setState({ elements, selectedIds: [], history: [], future: [] });

      const diagramSource = existing.diagramSource || '';
      const reg = useDiagramRegistry.getState();
      reg.updateSource(reg.activeDiagramId || 'default', diagramSource);
      useDiagramStore.getState().setSource(diagramSource);
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
    let nextActive: string | null = null;
    set((state) => {
      const updated = state.documents.filter((d) => d.id !== id);
      nextActive = state.activeDocumentId === id ? (updated[0]?.id ?? null) : state.activeDocumentId;
      return { documents: updated, activeDocumentId: nextActive };
    });

    if (nextActive && nextActive !== id) {
      await get().selectDocument(nextActive);
    }

    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    } catch {
      set({ syncStatus: 'error' });
    }
  },

  saveCurrentDocumentState: (data) => {
    const activeId = get().activeDocumentId;
    if (!activeId) return;

    set({ syncStatus: 'saving' });

    if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(async () => {
      const currentActiveId = get().activeDocumentId;
      if (!currentActiveId || currentActiveId !== activeId) {
        set({ syncStatus: 'synced' });
        return;
      }

      // Offline Guest Mode persistence (per document ID in localStorage)
      if (get().mode === 'offline' && get().authStatus === 'unauthenticated') {
        const guestDocs = getStoredGuestDocs();
        const whiteboardStr = data.whiteboardData !== undefined
          ? (typeof data.whiteboardData === 'string' ? data.whiteboardData : JSON.stringify(data.whiteboardData))
          : undefined;

        const updated = guestDocs.map((doc) => {
          if (doc.id !== currentActiveId) return doc;
          return {
            ...doc,
            ...(whiteboardStr !== undefined ? { whiteboardData: whiteboardStr } : {}),
            ...(data.diagramSource !== undefined ? { diagramSource: data.diagramSource } : {}),
            updatedAt: new Date().toISOString(),
          };
        });
        setStoredGuestDocs(updated);
        set((state) => ({
          documents: state.documents.map((doc) => {
            if (doc.id !== currentActiveId) return doc;
            return {
              ...doc,
              ...(whiteboardStr !== undefined ? { whiteboardData: whiteboardStr } : {}),
              ...(data.diagramSource !== undefined ? { diagramSource: data.diagramSource } : {}),
              updatedAt: new Date().toISOString(),
            };
          }),
          syncStatus: 'synced',
        }));
        return;
      }

      // Cloud Mode persistence (PATCH /api/documents/[id])
      try {
        const res = await fetch(`/api/documents/${currentActiveId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          set({ syncStatus: body.mode === 'offline' ? 'offline' : 'synced' });
        } else {
          set({ syncStatus: 'error' });
        }
      } catch {
        set({ syncStatus: 'error' });
      }
    }, 500);
  },

  togglePublicShare: async (isPublic: boolean) => {
    const activeId = get().activeDocumentId;
    if (!activeId) return { success: false, shareUrl: null };

    try {
      const res = await fetch(`/api/documents/${activeId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      if (!res.ok) {
        return { success: false, shareUrl: null };
      }
      const data = await res.json();
      set({ isPublic: data.isPublic, shareToken: data.shareToken });
      return { success: true, shareUrl: data.shareUrl };
    } catch {
      return { success: false, shareUrl: null };
    }
  },
}));
