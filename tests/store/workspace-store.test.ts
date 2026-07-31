import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkspaceStore } from '@/lib/store/workspace-store';

// Snapshot the pristine state once; restoring it in beforeEach gives every
// test a clean store (the merge keeps the action references intact).
const initialState = useWorkspaceStore.getState();

beforeEach(() => {
  useWorkspaceStore.setState(initialState);
});

describe('useWorkspaceStore defaults', () => {
  it('starts in the default layout', () => {
    const s = useWorkspaceStore.getState();
    expect(s.viewMode).toBe('both');
    expect(s.activeTab).toBe('whiteboard');
    expect(s.fileName).toBe('Untitled File');
  });

  it('starts with all panels closed and the main insert category', () => {
    const s = useWorkspaceStore.getState();
    expect(s.aiChatOpen).toBe(false);
    expect(s.diagramCodeOpen).toBe(false);
    expect(s.insertItemOpen).toBe(false);
    expect(s.insertItemCategory).toBe('main');
  });
});

describe('setters', () => {
  it('setViewMode / setActiveTab / setFileName', () => {
    useWorkspaceStore.getState().setViewMode('canvas');
    useWorkspaceStore.getState().setActiveTab('docs');
    useWorkspaceStore.getState().setFileName('Architecture.md');
    const s = useWorkspaceStore.getState();
    expect(s.viewMode).toBe('canvas');
    expect(s.activeTab).toBe('docs');
    expect(s.fileName).toBe('Architecture.md');
  });

  it('setAiChatOpen / setDiagramCodeOpen / setInsertItemOpen', () => {
    useWorkspaceStore.getState().setAiChatOpen(true);
    useWorkspaceStore.getState().setDiagramCodeOpen(true);
    useWorkspaceStore.getState().setInsertItemOpen(true);
    const s = useWorkspaceStore.getState();
    expect(s.aiChatOpen).toBe(true);
    expect(s.diagramCodeOpen).toBe(true);
    expect(s.insertItemOpen).toBe(true);
  });

  it('setInsertItemCategory', () => {
    useWorkspaceStore.getState().setInsertItemCategory('icons');
    expect(useWorkspaceStore.getState().insertItemCategory).toBe('icons');
  });
});

describe('toggles', () => {
  it('toggleAiChat flips the flag', () => {
    useWorkspaceStore.getState().toggleAiChat();
    expect(useWorkspaceStore.getState().aiChatOpen).toBe(true);
    useWorkspaceStore.getState().toggleAiChat();
    expect(useWorkspaceStore.getState().aiChatOpen).toBe(false);
  });

  it('toggleDiagramCode flips the flag', () => {
    useWorkspaceStore.getState().toggleDiagramCode();
    expect(useWorkspaceStore.getState().diagramCodeOpen).toBe(true);
    useWorkspaceStore.getState().toggleDiagramCode();
    expect(useWorkspaceStore.getState().diagramCodeOpen).toBe(false);
  });

  it('toggleInsertItem flips the flag and resets the category on EVERY toggle', () => {
    // Opening: category is forced back to 'main' even if it was changed.
    useWorkspaceStore.getState().setInsertItemCategory('shapes');
    useWorkspaceStore.getState().toggleInsertItem();
    expect(useWorkspaceStore.getState().insertItemOpen).toBe(true);
    expect(useWorkspaceStore.getState().insertItemCategory).toBe('main');

    // Closing: category is reset again.
    useWorkspaceStore.getState().setInsertItemCategory('icons');
    useWorkspaceStore.getState().toggleInsertItem();
    expect(useWorkspaceStore.getState().insertItemOpen).toBe(false);
    expect(useWorkspaceStore.getState().insertItemCategory).toBe('main');
  });
});
