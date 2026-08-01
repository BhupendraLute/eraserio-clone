import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore } from '@/lib/store/document-store';

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
    });
    vi.clearAllMocks();
  });

  it('starts with default initial state', () => {
    const state = useDocumentStore.getState();
    expect(state.documents).toEqual([]);
    expect(state.activeDocumentId).toBeNull();
    expect(state.activeDocumentTitle).toBe('Untitled Document');
    expect(state.syncStatus).toBe('synced');
  });

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

  it('renames document locally and triggers update', async () => {
    useDocumentStore.setState({
      documents: [
        {
          id: 'doc_1',
          title: 'Old Title',
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      activeDocumentId: 'doc_1',
      activeDocumentTitle: 'Old Title',
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

  it('deletes document and switches active document', async () => {
    useDocumentStore.setState({
      documents: [
        { id: 'doc_1', title: 'Doc 1', isPublic: false, createdAt: '', updatedAt: '' },
        { id: 'doc_2', title: 'Doc 2', isPublic: false, createdAt: '', updatedAt: '' },
      ],
      activeDocumentId: 'doc_1',
      activeDocumentTitle: 'Doc 1',
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));

    await useDocumentStore.getState().deleteDocument('doc_1');

    const state = useDocumentStore.getState();
    expect(state.documents.length).toBe(1);
    expect(state.activeDocumentId).toBe('doc_2');
  });
});
