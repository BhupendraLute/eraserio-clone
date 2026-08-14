import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useDocumentStore } from '@/lib/store/document-store';
import type { DocumentMetadata } from '@/lib/store/document-store';

const GUEST_DOCS_KEY = 'eraserio_guest_docs';

function meta(id: string, overrides: Partial<DocumentMetadata> = {}): DocumentMetadata {
  return {
    id,
    title: `Doc ${id}`,
    isPublic: false,
    shareToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function stubLocalStorage(initial: Record<string, string> = {}) {
  const storage = new Map<string, string>(Object.entries(initial));
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
  return storage;
}

describe('useDocumentStore', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documents: [],
      activeDocumentId: null,
      activeDocumentTitle: 'Untitled Document',
      syncStatus: 'synced',
      isPublic: false,
      shareToken: null,
      mode: 'offline',
      authStatus: 'loading',
      hasPendingGuestDocs: false,
      folders: [],
      isLoading: false,
    });
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts with default initial state', () => {
    const state = useDocumentStore.getState();
    expect(state.documents).toEqual([]);
    expect(state.activeDocumentId).toBeNull();
    expect(state.activeDocumentTitle).toBe('Untitled Document');
    expect(state.syncStatus).toBe('synced');
  });

  // ---------------------------------------------------------------------
  // Guest document helpers
  // ---------------------------------------------------------------------

  it('checkGuestDocuments reports pending guest docs from localStorage', () => {
    stubLocalStorage({ [GUEST_DOCS_KEY]: JSON.stringify([meta('g1')]) });
    expect(useDocumentStore.getState().checkGuestDocuments()).toBe(true);
    expect(useDocumentStore.getState().hasPendingGuestDocs).toBe(true);
  });

  it('checkGuestDocuments is false when no guest docs exist', () => {
    stubLocalStorage();
    expect(useDocumentStore.getState().checkGuestDocuments()).toBe(false);
    expect(useDocumentStore.getState().hasPendingGuestDocs).toBe(false);
  });

  it('clearGuestDocuments purges localStorage and resets the flag', () => {
    const storage = stubLocalStorage({ [GUEST_DOCS_KEY]: JSON.stringify([meta('g1')]) });
    useDocumentStore.setState({ hasPendingGuestDocs: true });
    useDocumentStore.getState().clearGuestDocuments();
    expect(storage.has(GUEST_DOCS_KEY)).toBe(false);
    expect(useDocumentStore.getState().hasPendingGuestDocs).toBe(false);
  });

  it('importGuestDocuments returns false when there is nothing to import', async () => {
    stubLocalStorage();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await useDocumentStore.getState().importGuestDocuments();
    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('importGuestDocuments imports, purges storage, and refreshes the list', async () => {
    const storage = stubLocalStorage({ [GUEST_DOCS_KEY]: JSON.stringify([meta('g1')]) });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
        // refresh from /api/documents after import
        .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [], mode: 'cloud' }) })
    );

    const result = await useDocumentStore.getState().importGuestDocuments();
    expect(result).toBe(true);
    expect(storage.has(GUEST_DOCS_KEY)).toBe(false);
    const s = useDocumentStore.getState();
    expect(s.hasPendingGuestDocs).toBe(false);
    expect(s.syncStatus).toBe('synced');
    expect(s.mode).toBe('cloud');
  });

  it('importGuestDocuments falls back to error status when the import fails', async () => {
    stubLocalStorage({ [GUEST_DOCS_KEY]: JSON.stringify([meta('g1')]) });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const result = await useDocumentStore.getState().importGuestDocuments();
    expect(result).toBe(false);
    expect(useDocumentStore.getState().syncStatus).toBe('error');
  });

  // ---------------------------------------------------------------------
  // Auth status
  // ---------------------------------------------------------------------

  it('setAuthStatus refetches documents and checks guest docs when authenticated', async () => {
    stubLocalStorage({ [GUEST_DOCS_KEY]: JSON.stringify([meta('g1')]) });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [meta('c1')], mode: 'cloud' }),
      })
    );

    useDocumentStore.getState().setAuthStatus('authenticated');
    await vi.waitFor(() => {
      const s = useDocumentStore.getState();
      expect(s.authStatus).toBe('authenticated');
      expect(s.mode).toBe('cloud');
      expect(s.hasPendingGuestDocs).toBe(true);
    });
  });

  it('setAuthStatus skips the guest check when not authenticated', async () => {
    stubLocalStorage({ [GUEST_DOCS_KEY]: JSON.stringify([meta('g1')]) });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ documents: [], mode: 'cloud' }) })
    );

    useDocumentStore.getState().setAuthStatus('unauthenticated');
    await vi.waitFor(() => {
      expect(useDocumentStore.getState().authStatus).toBe('unauthenticated');
    });
    expect(useDocumentStore.getState().hasPendingGuestDocs).toBe(false);
  });

  it('setAuthStatus does not refetch when the status is unchanged', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    useDocumentStore.getState().setAuthStatus('loading');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // Fetch / select
  // ---------------------------------------------------------------------

  it('fetchDocuments auto-selects the first document when none is active', async () => {
    const doc1 = meta('doc_1');
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/documents') {
          return Promise.resolve({ ok: true, json: async () => ({ documents: [doc1], mode: 'cloud' }) });
        }
        if (url === '/api/documents/doc_1') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              document: { ...doc1, whiteboardData: { elements: [] }, diagramSource: 'flowchart\n' },
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    await useDocumentStore.getState().fetchDocuments();
    const s = useDocumentStore.getState();
    expect(s.documents).toHaveLength(1);
    expect(s.mode).toBe('cloud');
    expect(s.activeDocumentId).toBe('doc_1');
    expect(s.activeDocumentTitle).toBe('Doc doc_1');
  });

  it('fetchDocuments clears a stale active id when no documents remain', async () => {
    useDocumentStore.setState({ activeDocumentId: 'gone', activeDocumentTitle: 'Gone' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ documents: [], mode: 'cloud' }) })
    );

    await useDocumentStore.getState().fetchDocuments();
    expect(useDocumentStore.getState().activeDocumentId).toBeNull();
  });

  it('fetchDocuments falls back to offline mode on failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    await useDocumentStore.getState().fetchDocuments();
    expect(useDocumentStore.getState().mode).toBe('offline');
  });

  it('selectDocument hydrates whiteboard data, diagram source, and share state', async () => {
    useDocumentStore.setState({
      documents: [meta('doc_1')],
      activeDocumentId: null,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          document: {
            ...meta('doc_1', { isPublic: true, shareToken: 'tok-1' }),
            whiteboardData: JSON.stringify([{ id: 'rect-1' }]),
            diagramSource: 'flowchart\nNodeA > NodeB: hi\n',
          },
        }),
      })
    );

    await useDocumentStore.getState().selectDocument('doc_1');
    const s = useDocumentStore.getState();
    expect(s.activeDocumentId).toBe('doc_1');
    expect(s.activeDocumentTitle).toBe('Doc doc_1');
    expect(s.isPublic).toBe(true);
    expect(s.shareToken).toBe('tok-1');
    expect(s.syncStatus).toBe('synced');
  });

  it('selectDocument falls back to local metadata when the fetch is offline', async () => {
    useDocumentStore.setState({
      documents: [meta('doc_1')],
      activeDocumentId: null,
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await useDocumentStore.getState().selectDocument('doc_1');
    expect(useDocumentStore.getState().activeDocumentTitle).toBe('Doc doc_1');
    expect(useDocumentStore.getState().syncStatus).toBe('synced');
  });

  it('selectDocument leaves the store untouched when the doc is missing everywhere', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await useDocumentStore.getState().selectDocument('ghost');
    expect(useDocumentStore.getState().syncStatus).toBe('saving');
  });

  // ---------------------------------------------------------------------
  // Create / duplicate
  // ---------------------------------------------------------------------

  it('creates a new document and updates store state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          document: {
            id: 'doc_123',
            title: 'Test Architecture',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      })
    );

    const id = await useDocumentStore.getState().createDocument('Test Architecture');
    expect(id).toBe('doc_123');

    const state = useDocumentStore.getState();
    expect(state.documents.length).toBe(1);
    expect(state.activeDocumentId).toBe('doc_123');
    expect(state.activeDocumentTitle).toBe('Test Architecture');
  });

  it('createDocument persists guest docs to localStorage in offline mode', async () => {
    const storage = stubLocalStorage();
    useDocumentStore.setState({ mode: 'offline' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ document: null }),
      })
    );

    const id = await useDocumentStore.getState().createDocument('Offline Doc');
    const saved = JSON.parse(storage.get(GUEST_DOCS_KEY)!);
    expect(saved[0].id).toBe(id);
    expect(saved[0].title).toBe('Offline Doc');
  });

  it('createDocument degrades to a local id when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const id = await useDocumentStore.getState().createDocument('Boom');
    expect(id).toMatch(/^doc-/);
    expect(useDocumentStore.getState().syncStatus).toBe('error');
  });

  it('duplicates a document, prepends it, and selects it', async () => {
    useDocumentStore.setState({ documents: [meta('doc_1')] });
    const duplicated = meta('doc_2', { title: 'Doc doc_1 (Copy)' });
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/documents/doc_1/duplicate') {
          return Promise.resolve({ ok: true, json: async () => ({ document: duplicated }) });
        }
        if (url === '/api/documents/doc_2') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ document: { ...duplicated, whiteboardData: '[]' } }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      })
    );

    const newId = await useDocumentStore.getState().duplicateDocument('doc_1');
    expect(newId).toBe('doc_2');
    const s = useDocumentStore.getState();
    expect(s.documents).toHaveLength(2);
    expect(s.documents[0].id).toBe('doc_2');
    expect(s.activeDocumentId).toBe('doc_2');
  });

  it('duplicateDocument returns null when the response has no document', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const newId = await useDocumentStore.getState().duplicateDocument('doc_1');
    expect(newId).toBeNull();
    // No document was produced — the store returns to idle rather than
    // leaving the UI stuck in 'saving'.
    expect(useDocumentStore.getState().syncStatus).toBe('synced');
  });

  it('duplicateDocument returns null when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const newId = await useDocumentStore.getState().duplicateDocument('doc_1');
    expect(newId).toBeNull();
    expect(useDocumentStore.getState().syncStatus).toBe('error');
  });

  // ---------------------------------------------------------------------
  // Rename / delete
  // ---------------------------------------------------------------------

  it('renames document locally and triggers update', async () => {
    useDocumentStore.setState({
      documents: [meta('doc_1')],
      activeDocumentId: 'doc_1',
      activeDocumentTitle: 'Doc doc_1',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ document: { id: 'doc_1', title: 'New Title' } }),
      })
    );

    await useDocumentStore.getState().renameDocument('doc_1', 'New Title');

    const state = useDocumentStore.getState();
    expect(state.activeDocumentTitle).toBe('New Title');
    expect(state.documents[0].title).toBe('New Title');
  });

  it('renameDocument only updates the active title for the active document', async () => {
    useDocumentStore.setState({
      documents: [meta('doc_1'), meta('doc_2')],
      activeDocumentId: 'doc_1',
      activeDocumentTitle: 'Doc doc_1',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    await useDocumentStore.getState().renameDocument('doc_2', 'Renamed Doc 2');
    const s = useDocumentStore.getState();
    expect(s.activeDocumentTitle).toBe('Doc doc_1');
    expect(s.documents[1].title).toBe('Renamed Doc 2');
  });

  it('renameDocument sets error status when the API fails', async () => {
    useDocumentStore.setState({
      documents: [meta('doc_1')],
      activeDocumentId: 'doc_1',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await useDocumentStore.getState().renameDocument('doc_1', 'X');
    expect(useDocumentStore.getState().syncStatus).toBe('error');
  });

  it('deletes document and switches active document', async () => {
    useDocumentStore.setState({
      documents: [meta('doc_1'), meta('doc_2')],
      activeDocumentId: 'doc_1',
      activeDocumentTitle: 'Doc doc_1',
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    await useDocumentStore.getState().deleteDocument('doc_1');

    const state = useDocumentStore.getState();
    expect(state.documents.length).toBe(1);
    expect(state.activeDocumentId).toBe('doc_2');
  });

  it('deleting the last document clears the active id', async () => {
    useDocumentStore.setState({
      documents: [meta('doc_1')],
      activeDocumentId: 'doc_1',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await useDocumentStore.getState().deleteDocument('doc_1');
    expect(useDocumentStore.getState().activeDocumentId).toBeNull();
  });

  // ---------------------------------------------------------------------
  // saveCurrentDocumentState (debounced)
  // ---------------------------------------------------------------------

  it('saveCurrentDocumentState debounces the PATCH and marks synced', async () => {
    vi.useFakeTimers();
    useDocumentStore.setState({ activeDocumentId: 'doc_1' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    useDocumentStore.getState().saveCurrentDocumentState({ docContent: 'hi' });
    expect(useDocumentStore.getState().syncStatus).toBe('saving');
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(fetch).toHaveBeenCalledWith(
      '/api/documents/doc_1',
      expect.objectContaining({ method: 'PATCH' })
    );
    expect(useDocumentStore.getState().syncStatus).toBe('synced');
  });

  it('saveCurrentDocumentState collapses rapid saves into one request', async () => {
    vi.useFakeTimers();
    useDocumentStore.setState({ activeDocumentId: 'doc_1' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    useDocumentStore.getState().saveCurrentDocumentState({ docContent: 'a' });
    vi.advanceTimersByTime(200);
    useDocumentStore.getState().saveCurrentDocumentState({ docContent: 'b' });
    await vi.advanceTimersByTimeAsync(500);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)).toEqual({
      docContent: 'b',
    });
  });

  it('saveCurrentDocumentState marks error when the PATCH fails', async () => {
    vi.useFakeTimers();
    useDocumentStore.setState({ activeDocumentId: 'doc_1' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    useDocumentStore.getState().saveCurrentDocumentState({ docContent: 'hi' });
    await vi.advanceTimersByTimeAsync(500);
    expect(useDocumentStore.getState().syncStatus).toBe('error');
  });

  it('saveCurrentDocumentState is a no-op without an active document', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    useDocumentStore.setState({ activeDocumentId: null });
    useDocumentStore.getState().saveCurrentDocumentState({ docContent: 'hi' });
    await vi.advanceTimersByTimeAsync(600);
    expect(fetch).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // togglePublicShare
  // ---------------------------------------------------------------------

  it('togglePublicShare publishes and stores the share URL', async () => {
    useDocumentStore.setState({ activeDocumentId: 'doc_1' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ isPublic: true, shareToken: 'tok-9', shareUrl: 'https://x/s/tok-9' }),
      })
    );

    const { success, shareUrl } = await useDocumentStore.getState().togglePublicShare(true);
    expect(success).toBe(true);
    expect(shareUrl).toBe('https://x/s/tok-9');
    const s = useDocumentStore.getState();
    expect(s.isPublic).toBe(true);
    expect(s.shareToken).toBe('tok-9');
  });

  it('togglePublicShare returns success false when the API fails', async () => {
    useDocumentStore.setState({ activeDocumentId: 'doc_1' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { success, shareUrl } = await useDocumentStore.getState().togglePublicShare(true);
    expect(success).toBe(false);
    expect(shareUrl).toBeNull();
  });

  it('togglePublicShare is a no-op without an active document', async () => {
    vi.stubGlobal('fetch', vi.fn());
    useDocumentStore.setState({ activeDocumentId: null });
    const { success, shareUrl } = await useDocumentStore.getState().togglePublicShare(true);
    expect(success).toBe(false);
    expect(shareUrl).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------
  // Folders & Batch Operations
  // ---------------------------------------------------------------------

  it('createFolder adds a folder and saves to state', () => {
    const id = useDocumentStore.getState().createFolder('New Folder', 'text-blue-400');
    expect(id).toMatch(/^folder-/);
    const folders = useDocumentStore.getState().folders;
    const found = folders.find((f) => f.id === id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('New Folder');
  });

  it('renameFolder updates folder name', () => {
    const id = useDocumentStore.getState().createFolder('Initial Name');
    useDocumentStore.getState().renameFolder(id, 'Renamed Folder');
    const folders = useDocumentStore.getState().folders;
    const found = folders.find((f) => f.id === id);
    expect(found?.name).toBe('Renamed Folder');
  });

  it('deleteFolder removes folder and resets doc folderId when deleteContents is false', () => {
    const fId = useDocumentStore.getState().createFolder('To Delete');
    useDocumentStore.setState({
      documents: [
        meta('d1', { folderId: fId }),
        meta('d2', { folderId: 'other' }),
      ],
    });

    useDocumentStore.getState().deleteFolder(fId, false);
    const s = useDocumentStore.getState();
    expect(s.folders.some((f) => f.id === fId)).toBe(false);
    expect(s.documents.find((d) => d.id === 'd1')?.folderId).toBeNull();
    expect(s.documents.find((d) => d.id === 'd2')?.folderId).toBe('other');
  });

  it('deleteFolder removes folder and deletes contained documents when deleteContents is true', () => {
    const fId = useDocumentStore.getState().createFolder('To Delete All');
    useDocumentStore.setState({
      documents: [
        meta('d1', { folderId: fId }),
        meta('d2', { folderId: 'other' }),
      ],
    });

    useDocumentStore.getState().deleteFolder(fId, true);
    const s = useDocumentStore.getState();
    expect(s.folders.some((f) => f.id === fId)).toBe(false);
    expect(s.documents.some((d) => d.id === 'd1')).toBe(false);
    expect(s.documents.some((d) => d.id === 'd2')).toBe(true);
  });

  it('batchMoveDocumentsToFolder moves multiple documents into a folder', () => {
    useDocumentStore.setState({
      documents: [meta('d1'), meta('d2'), meta('d3')],
    });

    useDocumentStore.getState().batchMoveDocumentsToFolder(['d1', 'd2'], 'f-designs');
    const s = useDocumentStore.getState();
    expect(s.documents.find((d) => d.id === 'd1')?.folderId).toBe('f-designs');
    expect(s.documents.find((d) => d.id === 'd2')?.folderId).toBe('f-designs');
    expect(s.documents.find((d) => d.id === 'd3')?.folderId).toBeUndefined();
  });

  it('batchArchiveDocuments archives multiple documents', async () => {
    useDocumentStore.setState({
      documents: [meta('d1', { isArchived: false }), meta('d2', { isArchived: false })],
    });

    await useDocumentStore.getState().batchArchiveDocuments(['d1', 'd2'], true);
    const s = useDocumentStore.getState();
    expect(s.documents.find((d) => d.id === 'd1')?.isArchived).toBe(true);
    expect(s.documents.find((d) => d.id === 'd2')?.isArchived).toBe(true);
  });

  it('batchDeleteDocuments removes multiple documents', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    useDocumentStore.setState({
      documents: [meta('d1'), meta('d2'), meta('d3')],
      activeDocumentId: 'd1',
    });

    await useDocumentStore.getState().batchDeleteDocuments(['d1', 'd2']);
    const s = useDocumentStore.getState();
    expect(s.documents.map((d) => d.id)).toEqual(['d3']);
    expect(s.activeDocumentId).toBeNull();
  });

  it('duplicateDocument creates offline copy when API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    useDocumentStore.setState({
      documents: [meta('d1', { title: 'Architecture Diagram', whiteboardData: '[]' })],
    });

    const newId = await useDocumentStore.getState().duplicateDocument('d1');
    expect(newId).toMatch(/^doc-/);
    const s = useDocumentStore.getState();
    const duplicated = s.documents.find((d) => d.id === newId);
    expect(duplicated?.title).toBe('Architecture Diagram (Copy)');
    expect(s.activeDocumentId).toBe(newId);
  });

  it('workspace operations manage workspace list and active selection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          workspaces: [{ id: 'ws-1', name: 'Core Team', ownerId: 'u1', createdAt: new Date().toISOString() }],
        }),
      })
    );

    await useDocumentStore.getState().fetchWorkspaces();
    expect(useDocumentStore.getState().workspaces).toHaveLength(1);
    expect(useDocumentStore.getState().activeWorkspaceId).toBe('ws-1');

    useDocumentStore.getState().setActiveWorkspace('ws-custom');
    expect(useDocumentStore.getState().activeWorkspaceId).toBe('ws-custom');
  });
});
