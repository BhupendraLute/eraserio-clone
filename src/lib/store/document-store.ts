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
  color?: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    documents: number;
    members: number;
  };
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
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  activeDocumentId: string | null;
  activeDocumentTitle: string;
  syncStatus: SyncStatus;
  isPublic: boolean;
  shareToken: string | null;
  mode: 'cloud' | 'offline';
  authStatus: AuthStatus;
  hasPendingGuestDocs: boolean;
  isLoading: boolean;

  setAuthStatus: (status: AuthStatus) => void;
  fetchDocuments: () => Promise<void>;
  createDocument: (title?: string, initialDiagram?: string, folderId?: string | null) => Promise<string>;
  duplicateDocument: (id: string) => Promise<string | null>;
  selectDocument: (id: string) => Promise<void>;
  renameDocument: (id: string, newTitle: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  archiveDocument: (id: string, archive?: boolean) => Promise<void>;
  batchDeleteDocuments: (ids: string[]) => Promise<void>;
  batchArchiveDocuments: (ids: string[], archive: boolean) => Promise<void>;
  batchMoveDocumentsToFolder: (docIds: string[], folderId: string | null) => void;
  createFolder: (name: string, color?: string) => string;
  renameFolder: (folderId: string, newName: string) => void;
  deleteFolder: (folderId: string, deleteContents?: boolean) => void;
  moveDocumentToFolder: (docId: string, folderId: string | null) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<WorkspaceItem | null>;
  setActiveWorkspace: (id: string) => void;
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
const FOLDERS_KEY = 'eraserio_folders';
const DOC_META_KEY = 'eraserio_doc_meta';

interface StoredDocMeta {
  isArchived?: boolean;
  folderId?: string | null;
  isPrivate?: boolean;
}

function getStoredDocMeta(): Record<string, StoredDocMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DOC_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredDocMeta(map: Record<string, StoredDocMeta>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DOC_META_KEY, JSON.stringify(map));
  } catch {
    // quota exceeded or SSR
  }
}

function updateDocMeta(docId: string, partial: StoredDocMeta) {
  const current = getStoredDocMeta();
  current[docId] = { ...current[docId], ...partial };
  setStoredDocMeta(current);
}

function batchUpdateDocMeta(docIds: string[], partial: StoredDocMeta) {
  const current = getStoredDocMeta();
  for (const id of docIds) {
    current[id] = { ...current[id], ...partial };
  }
  setStoredDocMeta(current);
}

function removeDocMeta(docIds: string[]) {
  const current = getStoredDocMeta();
  for (const id of docIds) {
    delete current[id];
  }
  setStoredDocMeta(current);
}

const DEFAULT_FOLDERS: DashboardFolder[] = [
  { id: 'f-architecture', name: 'Architecture System', createdAt: new Date().toISOString() },
  { id: 'f-designs', name: 'UI / Wireframes', createdAt: new Date().toISOString() },
];

function getStoredFolders(): DashboardFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
    // Initialize default folders on first run only
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(DEFAULT_FOLDERS));
    return DEFAULT_FOLDERS;
  } catch {
    return [];
  }
}

function setStoredFolders(folders: DashboardFolder[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    // quota exceeded or SSR
  }
}

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
  folders: [],
  workspaces: [],
  activeWorkspaceId: null,
  activeDocumentId: null,
  activeDocumentTitle: 'Untitled Document',
  syncStatus: 'synced',
  isPublic: false,
  shareToken: null,
  mode: 'offline',
  authStatus: 'loading',
  hasPendingGuestDocs: false,
  isLoading: true,

  setAuthStatus: (authStatus) => {
    const prev = get().authStatus;
    set({ authStatus, folders: getStoredFolders() });

    if (prev !== authStatus) {
      void get().fetchDocuments();
      void get().fetchWorkspaces();
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

  fetchWorkspaces: async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        const wsList: WorkspaceItem[] = data.workspaces || [];
        set({
          workspaces: wsList,
          activeWorkspaceId: wsList.length > 0 ? wsList[0].id : null,
        });
      }
    } catch {
      // offline / unauthenticated
    }
  },

  createWorkspace: async (name: string) => {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.workspace) {
        set((state) => ({
          workspaces: [data.workspace, ...state.workspaces],
          activeWorkspaceId: data.workspace.id,
        }));
        return data.workspace;
      }
      return null;
    } catch {
      return null;
    }
  },

  setActiveWorkspace: (id: string) => {
    set({ activeWorkspaceId: id });
  },

  fetchDocuments: async () => {
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const docs: DocumentMetadata[] = data.documents || [];
      const mode = data.mode || 'offline';

      let resolvedDocs = docs;
      if (mode === 'offline') {
        const guestDocs = getStoredGuestDocs();
        if (guestDocs.length > 0) {
          resolvedDocs = guestDocs;
        } else if (get().documents.length > 0) {
          resolvedDocs = get().documents;
          setStoredGuestDocs(resolvedDocs);
        }
      }

      // Merge local metadata (isArchived, folderId, isPrivate) into all documents
      const metaMap = getStoredDocMeta();
      resolvedDocs = resolvedDocs.map((d) => ({
        ...d,
        isArchived: metaMap[d.id]?.isArchived !== undefined ? metaMap[d.id].isArchived : (d.isArchived ?? false),
        folderId: metaMap[d.id]?.folderId !== undefined ? metaMap[d.id].folderId : (d.folderId ?? null),
        isPrivate: metaMap[d.id]?.isPrivate !== undefined ? metaMap[d.id].isPrivate : (d.isPrivate ?? false),
      }));

      const currentId = get().activeDocumentId;
      const stillExists = currentId ? resolvedDocs.some((d) => d.id === currentId) : false;

      set({
        documents: resolvedDocs,
        folders: getStoredFolders(),
        mode,
        isLoading: false,
        ...(currentId && !stillExists ? { activeDocumentId: null } : {}),
      });

      if (resolvedDocs.length > 0 && !get().activeDocumentId) {
        await get().selectDocument(resolvedDocs[0].id);
      }
    } catch {
      const guestDocs = getStoredGuestDocs();
      let resolvedDocs = guestDocs.length > 0 ? guestDocs : get().documents;
      const metaMap = getStoredDocMeta();
      resolvedDocs = resolvedDocs.map((d) => ({
        ...d,
        isArchived: metaMap[d.id]?.isArchived !== undefined ? metaMap[d.id].isArchived : (d.isArchived ?? false),
        folderId: metaMap[d.id]?.folderId !== undefined ? metaMap[d.id].folderId : (d.folderId ?? null),
        isPrivate: metaMap[d.id]?.isPrivate !== undefined ? metaMap[d.id].isPrivate : (d.isPrivate ?? false),
      }));
      set({ mode: 'offline', documents: resolvedDocs, folders: getStoredFolders(), isLoading: false });
    }
  },

  createDocument: async (title = 'Untitled Document', initialDiagram?: string, folderId?: string | null) => {
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
        folderId: folderId || null,
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

      if (folderId) {
        updateDocMeta(newId, { folderId });
      }

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
    updateDocMeta(id, { isArchived: archive });
    const updated = get().documents.map((d) => (d.id === id ? { ...d, isArchived: archive } : d));
    set({ documents: updated });

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      const targetDocs = guestDocs.length > 0 ? guestDocs : updated;
      const updatedGuest = targetDocs.map((d) => (d.id === id ? { ...d, isArchived: archive } : d));
      setStoredGuestDocs(updatedGuest);
    }
  },

  batchDeleteDocuments: async (ids: string[]) => {
    if (ids.length === 0) return;
    removeDocMeta(ids);
    const idSet = new Set(ids);
    set((state) => ({
      documents: state.documents.filter((d) => !idSet.has(d.id)),
      activeDocumentId: state.activeDocumentId && idSet.has(state.activeDocumentId) ? null : state.activeDocumentId,
    }));

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      setStoredGuestDocs(guestDocs.filter((d) => !idSet.has(d.id)));
    }

    try {
      await Promise.all(
        ids.map((id) => fetch(`/api/documents/${id}`, { method: 'DELETE' }).catch(() => {}))
      );
    } catch {
      // offline error handled
    }
  },

  batchArchiveDocuments: async (ids: string[], archive: boolean) => {
    if (ids.length === 0) return;
    batchUpdateDocMeta(ids, { isArchived: archive });
    const idSet = new Set(ids);
    const updated = get().documents.map((d) => (idSet.has(d.id) ? { ...d, isArchived: archive } : d));
    set({ documents: updated });

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      const targetDocs = guestDocs.length > 0 ? guestDocs : updated;
      const updatedGuest = targetDocs.map((d) => (idSet.has(d.id) ? { ...d, isArchived: archive } : d));
      setStoredGuestDocs(updatedGuest);
    }
  },

  batchMoveDocumentsToFolder: (docIds: string[], folderId: string | null) => {
    if (docIds.length === 0) return;
    batchUpdateDocMeta(docIds, { folderId });
    const idSet = new Set(docIds);
    const updated = get().documents.map((d) => (idSet.has(d.id) ? { ...d, folderId } : d));
    set({ documents: updated });

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      const targetDocs = guestDocs.length > 0 ? guestDocs : updated;
      const updatedGuest = targetDocs.map((d) => (idSet.has(d.id) ? { ...d, folderId } : d));
      setStoredGuestDocs(updatedGuest);
    }
  },

  createFolder: (name: string, color?: string) => {
    const newFolder: DashboardFolder = {
      id: generateId('folder'),
      name,
      createdAt: new Date().toISOString(),
      ...(color ? { color } : {}),
    };
    const updatedFolders = [...get().folders, newFolder];
    set({ folders: updatedFolders });
    setStoredFolders(updatedFolders);
    return newFolder.id;
  },

  renameFolder: (folderId: string, newName: string) => {
    const updatedFolders = get().folders.map((f) =>
      f.id === folderId ? { ...f, name: newName } : f
    );
    set({ folders: updatedFolders });
    setStoredFolders(updatedFolders);
  },

  deleteFolder: (folderId: string, deleteContents = false) => {
    const updatedFolders = get().folders.filter((f) => f.id !== folderId);
    setStoredFolders(updatedFolders);

    const updatedDocs = deleteContents
      ? get().documents.filter((d) => d.folderId !== folderId)
      : get().documents.map((d) => (d.folderId === folderId ? { ...d, folderId: null } : d));

    if (deleteContents) {
      const deletedIds = get().documents.filter((d) => d.folderId === folderId).map((d) => d.id);
      removeDocMeta(deletedIds);
    } else {
      const resetIds = get().documents.filter((d) => d.folderId === folderId).map((d) => d.id);
      batchUpdateDocMeta(resetIds, { folderId: null });
    }

    set({
      folders: updatedFolders,
      documents: updatedDocs,
    });

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      const updatedGuest = deleteContents
        ? guestDocs.filter((d) => d.folderId !== folderId)
        : guestDocs.map((d) => (d.folderId === folderId ? { ...d, folderId: null } : d));
      setStoredGuestDocs(updatedGuest);
    }
  },

  moveDocumentToFolder: (docId: string, folderId: string | null) => {
    updateDocMeta(docId, { folderId });
    const updated = get().documents.map((d) => (d.id === docId ? { ...d, folderId } : d));
    set({ documents: updated });

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      const targetDocs = guestDocs.length > 0 ? guestDocs : updated;
      const updatedGuest = targetDocs.map((d) => (d.id === docId ? { ...d, folderId } : d));
      setStoredGuestDocs(updatedGuest);
    }
  },

  duplicateDocument: async (id: string) => {
    set({ syncStatus: 'saving' });
    try {
      const res = await fetch(`/api/documents/${id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
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
            folderId: duplicated.folderId || null,
          };

          set((state) => ({
            documents: [newMeta, ...state.documents],
            syncStatus: 'synced',
          }));

          await get().selectDocument(duplicated.id);
          return duplicated.id;
        }

        // Nothing was duplicated — return to idle instead of leaving the UI stuck on saving
        set({ syncStatus: 'synced' });
        return null;
      }
    } catch {
      // offline fallback
    }

    // Offline / Guest mode fallback duplication
    const sourceDoc = get().documents.find((d) => d.id === id);
    if (!sourceDoc) {
      set({ syncStatus: 'error' });
      return null;
    }

    const newId = generateId('doc');
    const now = new Date().toISOString();
    const copyTitle = sourceDoc.title.endsWith('(Copy)')
      ? sourceDoc.title
      : `${sourceDoc.title} (Copy)`;

    const guestDocs = getStoredGuestDocs();
    const storedSource = guestDocs.find((d) => d.id === id);

    const newMeta: DocumentMetadata = {
      id: newId,
      title: copyTitle,
      isPublic: false,
      shareToken: null,
      createdAt: now,
      updatedAt: now,
      whiteboardData: storedSource?.whiteboardData || sourceDoc.whiteboardData || '[]',
      diagramSource: storedSource?.diagramSource || sourceDoc.diagramSource || '',
      docContent: storedSource?.docContent || sourceDoc.docContent || '',
      folderId: sourceDoc.folderId || null,
      isArchived: false,
    };

    set((state) => ({
      documents: [newMeta, ...state.documents],
      syncStatus: 'synced',
    }));

    if (get().mode === 'offline') {
      setStoredGuestDocs([newMeta, ...guestDocs]);
    }

    await get().selectDocument(newId);
    return newId;
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
    const updated = get().documents.map((d) => (d.id === id ? { ...d, title: newTitle } : d));
    set((state) => ({
      activeDocumentTitle: state.activeDocumentId === id ? newTitle : state.activeDocumentTitle,
      documents: updated,
      syncStatus: 'saving',
    }));

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      const targetDocs = guestDocs.length > 0 ? guestDocs : updated;
      const updatedGuest = targetDocs.map((d) => (d.id === id ? { ...d, title: newTitle } : d));
      setStoredGuestDocs(updatedGuest);
    }

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        set({ syncStatus: 'synced' });
      } else {
        set({ syncStatus: 'error' });
      }
    } catch {
      set({ syncStatus: 'error' });
    }
  },

  deleteDocument: async (id: string) => {
    removeDocMeta([id]);
    let nextActive: string | null = null;
    set((state) => {
      const updated = state.documents.filter((d) => d.id !== id);
      nextActive = state.activeDocumentId === id ? (updated[0]?.id ?? null) : state.activeDocumentId;
      return { documents: updated, activeDocumentId: nextActive };
    });

    if (get().mode === 'offline') {
      const guestDocs = getStoredGuestDocs();
      setStoredGuestDocs(guestDocs.filter((d) => d.id !== id));
    }

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
