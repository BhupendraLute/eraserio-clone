import { describe, it, expect, beforeEach } from 'vitest';
import { useCollaborationStore } from '@/lib/collaboration/collaboration-store';
import { getCollaboratorColor } from '@/lib/collaboration/types';
import type { CollaboratorPresence } from '@/lib/collaboration/types';

describe('Realtime Collaboration Engine Tests', () => {
  beforeEach(() => {
    useCollaborationStore.getState().reset();
    useCollaborationStore.setState({ localUser: null, collaborators: new Map() });
  });

  describe('User Color Generator (DRY)', () => {
    it('generates consistent, deterministic color palettes for user IDs', () => {
      const color1 = getCollaboratorColor('user_123');
      const color2 = getCollaboratorColor('user_123');
      const color3 = getCollaboratorColor('user_456');

      expect(color1.hex).toBe(color2.hex);
      expect(color1.borderHex).toBe(color2.borderHex);
      expect(typeof color3.hex).toBe('string');
    });
  });

  describe('Collaboration Store Presence', () => {
    it('initializes local user presence identity', () => {
      const user = useCollaborationStore.getState().initializeLocalUser('usr_abc', 'Alice', 'alice@example.com');

      expect(user.id).toBe('usr_abc');
      expect(user.name).toBe('Alice');
      expect(user.email).toBe('alice@example.com');
      expect(user.color).toBeDefined();
      expect(useCollaborationStore.getState().localUser).toEqual(user);
    });

    it('sets presence snapshot ignoring local user', () => {
      useCollaborationStore.getState().initializeLocalUser('local_1');

      const mockCollaborators: CollaboratorPresence[] = [
        {
          id: 'local_1',
          name: 'Local User',
          color: getCollaboratorColor('local_1'),
          cursor: null,
          selectedElementIds: [],
          lastActive: Date.now(),
        },
        {
          id: 'peer_2',
          name: 'Bob',
          color: getCollaboratorColor('peer_2'),
          cursor: { x: 100, y: 200 },
          selectedElementIds: ['el_1'],
          lastActive: Date.now(),
        },
      ];

      useCollaborationStore.getState().setSnapshot(mockCollaborators);

      const collaborators = useCollaborationStore.getState().collaborators;
      expect(collaborators.has('local_1')).toBe(false);
      expect(collaborators.has('peer_2')).toBe(true);
      expect(collaborators.get('peer_2')?.name).toBe('Bob');
    });

    it('upserts and removes peer collaborators', () => {
      useCollaborationStore.getState().initializeLocalUser('local_1');

      const peer: CollaboratorPresence = {
        id: 'peer_99',
        name: 'Charlie',
        color: getCollaboratorColor('peer_99'),
        cursor: null,
        selectedElementIds: [],
        lastActive: Date.now(),
      };

      useCollaborationStore.getState().upsertCollaborator(peer);
      expect(useCollaborationStore.getState().collaborators.has('peer_99')).toBe(true);

      useCollaborationStore.getState().updateCollaboratorCursor('peer_99', { x: 350, y: 450 });
      expect(useCollaborationStore.getState().collaborators.get('peer_99')?.cursor).toEqual({ x: 350, y: 450 });

      useCollaborationStore.getState().updateCollaboratorSelection('peer_99', ['node_a', 'node_b']);
      expect(useCollaborationStore.getState().collaborators.get('peer_99')?.selectedElementIds).toEqual(['node_a', 'node_b']);

      useCollaborationStore.getState().removeCollaborator('peer_99');
      expect(useCollaborationStore.getState().collaborators.has('peer_99')).toBe(false);
    });

    it('updates local cursor and selection without breaking state', () => {
      useCollaborationStore.getState().initializeLocalUser('local_1', 'Dave');

      useCollaborationStore.getState().updateLocalCursor({ x: 50, y: 75 });
      expect(useCollaborationStore.getState().localUser?.cursor).toEqual({ x: 50, y: 75 });

      useCollaborationStore.getState().updateLocalSelection(['shape_1']);
      expect(useCollaborationStore.getState().localUser?.selectedElementIds).toEqual(['shape_1']);
    });
  });
});
