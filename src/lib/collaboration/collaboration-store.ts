import { create } from 'zustand';
import type { CollaboratorPresence, CursorPosition, UserColor } from './types';
import { getCollaboratorColor } from './types';
import { generateId } from '@/lib/utils';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface CollaborationStoreState {
  documentId: string | null;
  status: ConnectionStatus;
  localUser: CollaboratorPresence | null;
  collaborators: Map<string, CollaboratorPresence>;
  followingUserId: string | null;
  setFollowingUserId: (id: string | null) => void;
  
  // Actions
  initializeLocalUser: (userId?: string, name?: string, email?: string, image?: string) => CollaboratorPresence;
  setDocumentId: (documentId: string | null) => void;
  setStatus: (status: ConnectionStatus) => void;
  setSnapshot: (collaborators: CollaboratorPresence[]) => void;
  upsertCollaborator: (collaborator: CollaboratorPresence) => void;
  updateCollaboratorCursor: (userId: string, cursor: CursorPosition | null) => void;
  updateCollaboratorSelection: (userId: string, selectedIds: string[]) => void;
  removeCollaborator: (userId: string) => void;
  updateLocalCursor: (cursor: CursorPosition | null) => void;
  updateLocalSelection: (selectedElementIds: string[]) => void;
  reset: () => void;
}

export const useCollaborationStore = create<CollaborationStoreState>((set, get) => ({
  documentId: null,
  status: 'disconnected',
  localUser: null,
  collaborators: new Map(),
  followingUserId: null,

  setFollowingUserId: (id) => set({ followingUserId: id }),

  initializeLocalUser: (userId, name, email, image) => {
    const existing = get().localUser;
    if (existing && (!userId || existing.id === userId)) {
      return existing;
    }

    const id = userId || generateId('guest');
    const userName = name || (userId ? 'User' : `Guest ${id.slice(-4)}`);
    const color: UserColor = getCollaboratorColor(id);

    const user: CollaboratorPresence = {
      id,
      name: userName,
      email,
      image,
      color,
      cursor: null,
      selectedElementIds: [],
      lastActive: Date.now(),
    };

    set({ localUser: user });
    return user;
  },

  setDocumentId: (documentId) => set({ documentId }),

  setStatus: (status) => set({ status }),

  setSnapshot: (collaboratorsList) => {
    const localId = get().localUser?.id;
    const map = new Map<string, CollaboratorPresence>();
    
    for (const c of collaboratorsList) {
      if (c.id !== localId) {
        map.set(c.id, c);
      }
    }
    set({ collaborators: map });
  },

  upsertCollaborator: (collaborator) => {
    const localId = get().localUser?.id;
    if (collaborator.id === localId) return;

    set((state) => {
      const updated = new Map(state.collaborators);
      updated.set(collaborator.id, collaborator);
      return { collaborators: updated };
    });
  },

  updateCollaboratorCursor: (userId, cursor) => {
    const localId = get().localUser?.id;
    if (userId === localId) return;

    set((state) => {
      const existing = state.collaborators.get(userId);
      if (!existing) return state;

      const updated = new Map(state.collaborators);
      updated.set(userId, {
        ...existing,
        cursor,
        lastActive: Date.now(),
      });
      return { collaborators: updated };
    });
  },

  updateCollaboratorSelection: (userId, selectedIds) => {
    const localId = get().localUser?.id;
    if (userId === localId) return;

    set((state) => {
      const existing = state.collaborators.get(userId);
      if (!existing) return state;

      const updated = new Map(state.collaborators);
      updated.set(userId, {
        ...existing,
        selectedElementIds: selectedIds,
        lastActive: Date.now(),
      });
      return { collaborators: updated };
    });
  },

  removeCollaborator: (userId) => {
    set((state) => {
      if (!state.collaborators.has(userId)) return state;
      const updated = new Map(state.collaborators);
      updated.delete(userId);
      return { collaborators: updated };
    });
  },

  updateLocalCursor: (cursor) => {
    set((state) => {
      if (!state.localUser) return state;
      return {
        localUser: {
          ...state.localUser,
          cursor,
          lastActive: Date.now(),
        },
      };
    });
  },

  updateLocalSelection: (selectedElementIds) => {
    set((state) => {
      if (!state.localUser) return state;
      return {
        localUser: {
          ...state.localUser,
          selectedElementIds,
          lastActive: Date.now(),
        },
      };
    });
  },

  reset: () => {
    set({
      documentId: null,
      status: 'disconnected',
      collaborators: new Map(),
    });
  },
}));
