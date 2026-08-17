'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCollaborationStore } from '@/lib/collaboration/collaboration-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDocumentStore } from '@/lib/store/document-store';
import type {
  CollaborationMessage,
  CursorPosition,
} from '@/lib/collaboration/types';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';

export function useRealtimeCollaboration() {
  const { data: session } = useSession();
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId);

  const setDocumentId = useCollaborationStore((s) => s.setDocumentId);
  const setStatus = useCollaborationStore((s) => s.setStatus);
  const initializeLocalUser = useCollaborationStore((s) => s.initializeLocalUser);
  const setSnapshot = useCollaborationStore((s) => s.setSnapshot);
  const upsertCollaborator = useCollaborationStore((s) => s.upsertCollaborator);
  const removeCollaborator = useCollaborationStore((s) => s.removeCollaborator);
  const updateCollaboratorCursor = useCollaborationStore((s) => s.updateCollaboratorCursor);
  const updateCollaboratorSelection = useCollaborationStore((s) => s.updateCollaboratorSelection);
  const updateLocalCursor = useCollaborationStore((s) => s.updateLocalCursor);
  const updateLocalSelection = useCollaborationStore((s) => s.updateLocalSelection);
  const resetCollaboration = useCollaborationStore((s) => s.reset);

  const elements = useWhiteboardStore((s) => s.elements);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const diagramSource = useDiagramStore((s) => s.source);

  const eventSourceRef = useRef<EventSource | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // rAF Batching & Latency Optimization Refs
  const pendingCursorRef = useRef<CursorPosition | null>(null);
  const cursorRafIdRef = useRef<number | null>(null);
  const lastSentCursorRef = useRef<CursorPosition | null>(null);

  // Guards against echo loops when receiving remote changes
  const isRemoteWhiteboardUpdateRef = useRef<boolean>(false);
  const isRemoteDiagramUpdateRef = useRef<boolean>(false);

  const prevElementsRef = useRef<WhiteboardElement[]>(elements);
  const prevDiagramSourceRef = useRef<string>(diagramSource);
  const prevSelectedIdsRef = useRef<string[]>(selectedIds);

  const isDocumentLoading = useDocumentStore((s) => s.isLoading);
  const knownSenderIdsRef = useRef<Set<string>>(new Set());

  // Initialize Local User Identity
  useEffect(() => {
    const userId = session?.user?.id;
    const userName = session?.user?.name ?? undefined;
    const userEmail = session?.user?.email ?? undefined;
    const userImage = session?.user?.image ?? undefined;

    const user = initializeLocalUser(userId, userName, userEmail, userImage);
    if (user?.id) {
      knownSenderIdsRef.current.add(user.id);
    }
  }, [session, initializeLocalUser]);

  // High-Performance Low-Latency Message Dispatcher
  const broadcastMessage = useCallback(
    (message: CollaborationMessage) => {
      if (!activeDocumentId) return;

      // 1. Instant local tab-to-tab broadcast via BroadcastChannel (0ms latency)
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage(message);
        } catch (e) {
          console.warn('[RealtimeCollab] BroadcastChannel error:', e);
        }
      }

      // 2. High-priority keepalive HTTP publish stream to server
      const payload = JSON.stringify(message);
      const url = `/api/documents/${activeDocumentId}/collaboration/publish`;

      // Try navigator.sendBeacon for zero-blocking payload flush if available
      if (typeof navigator !== 'undefined' && navigator.sendBeacon && message.type === 'CURSOR_MOVE') {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch((err) => {
        console.warn('[RealtimeCollab] Server publish error:', err);
      });
    },
    [activeDocumentId]
  );

  // Core message handler for incoming SSE or BroadcastChannel events
  const handleIncomingMessage = useCallback(
    (message: CollaborationMessage) => {
      const localUser = useCollaborationStore.getState().localUser;
      if (!localUser || message.senderId === localUser.id || knownSenderIdsRef.current.has(message.senderId)) {
        return; // Ignore own reflected events from any local session ID variation
      }

      switch (message.type) {
        case 'PRESENCE_SNAPSHOT':
          setSnapshot(message.collaborators);
          break;

        case 'USER_JOINED':
          upsertCollaborator(message.user);
          break;

        case 'USER_LEFT':
          removeCollaborator(message.userId);
          break;

        case 'CURSOR_MOVE':
          updateCollaboratorCursor(message.senderId, message.cursor);
          break;

        case 'SELECTION_CHANGE':
          updateCollaboratorSelection(message.senderId, message.selectedElementIds);
          break;

        case 'WHITEBOARD_UPDATE':
          isRemoteWhiteboardUpdateRef.current = true;
          if (message.action === 'patch' && Array.isArray(message.patches)) {
            const currentEls = useWhiteboardStore.getState().elements;
            const patchMap = new Map(message.patches.map((p) => [p.id, p]));
            const updated = currentEls.map((el) => {
              const p = patchMap.get(el.id);
              return p ? { ...el, ...p } : el;
            });
            useWhiteboardStore.setState({ elements: updated });
          } else if (Array.isArray(message.elements)) {
            useWhiteboardStore.setState({
              elements: message.elements as WhiteboardElement[],
            });
          }
          setTimeout(() => {
            isRemoteWhiteboardUpdateRef.current = false;
          }, 30);
          break;

        case 'DIAGRAM_UPDATE':
          if (typeof message.source === 'string') {
            isRemoteDiagramUpdateRef.current = true;
            useDiagramStore.getState().setSource(message.source);
            setTimeout(() => {
              isRemoteDiagramUpdateRef.current = false;
            }, 30);
          }
          break;

        default:
          break;
      }
    },
    [
      setSnapshot,
      upsertCollaborator,
      removeCollaborator,
      updateCollaboratorCursor,
      updateCollaboratorSelection,
    ]
  );

  // Main SSE & BroadcastChannel setup effect per document
  useEffect(() => {
    if (!activeDocumentId) {
      resetCollaboration();
      return;
    }

    setDocumentId(activeDocumentId);
    setStatus('connecting');

    const localUser = useCollaborationStore.getState().localUser;
    const userId = localUser?.id || `guest_${Math.random().toString(36).slice(2, 8)}`;
    const userName = encodeURIComponent(localUser?.name || 'Guest');
    const userImage = localUser?.image ? encodeURIComponent(localUser.image) : '';

    // 1. Setup local multi-tab BroadcastChannel
    const channelName = `eraserio_collab_${activeDocumentId}`;
    const bc = new BroadcastChannel(channelName);
    bc.onmessage = (event: MessageEvent<CollaborationMessage>) => {
      if (event.data) {
        handleIncomingMessage(event.data);
      }
    };
    broadcastChannelRef.current = bc;

    // 2. Setup Server SSE EventSource connection
    const sseUrl = `/api/documents/${activeDocumentId}/collaboration?userId=${userId}&userName=${userName}&userImage=${userImage}`;
    const es = new EventSource(sseUrl);

    es.onopen = () => {
      setStatus('connected');
    };

    es.onmessage = (event) => {
      try {
        const message: CollaborationMessage = JSON.parse(event.data);
        handleIncomingMessage(message);
      } catch (err) {
        console.warn('[RealtimeCollab] Failed to parse SSE message:', err);
      }
    };

    es.onerror = () => {
      setStatus('reconnecting');
    };

    eventSourceRef.current = es;

    return () => {
      es.close();
      eventSourceRef.current = null;
      bc.close();
      broadcastChannelRef.current = null;
      if (cursorRafIdRef.current) {
        cancelAnimationFrame(cursorRafIdRef.current);
      }
      resetCollaboration();
    };
  }, [activeDocumentId, setDocumentId, setStatus, resetCollaboration, handleIncomingMessage]);

  const lastHttpCursorTimeRef = useRef<number>(0);

  // Low-Latency rAF-Batched Pointer Cursor Publisher (Throttled HTTP Stream)
  const publishCursor = useCallback(
    (cursor: CursorPosition | null) => {
      updateLocalCursor(cursor);
      pendingCursorRef.current = cursor;

      if (cursorRafIdRef.current !== null) {
        return;
      }

      cursorRafIdRef.current = requestAnimationFrame(() => {
        cursorRafIdRef.current = null;

        const targetCursor = pendingCursorRef.current;
        const lastSent = lastSentCursorRef.current;

        // Skip sending duplicate cursor positions
        if (
          targetCursor &&
          lastSent &&
          Math.abs(targetCursor.x - lastSent.x) < 0.5 &&
          Math.abs(targetCursor.y - lastSent.y) < 0.5
        ) {
          return;
        }

        lastSentCursorRef.current = targetCursor;
        const localUser = useCollaborationStore.getState().localUser;
        if (!localUser || !activeDocumentId) return;

        const msg: CollaborationMessage = {
          type: 'CURSOR_MOVE',
          senderId: localUser.id,
          documentId: activeDocumentId,
          timestamp: Date.now(),
          cursor: targetCursor,
        };

        // 1. Instant 0ms local tab-to-tab BroadcastChannel
        if (broadcastChannelRef.current) {
          try {
            broadcastChannelRef.current.postMessage(msg);
          } catch (e) {
            console.warn('[RealtimeCollab] BroadcastChannel error:', e);
          }
        }

        // 2. Throttle HTTP POST cursor stream to server to max 10 packets/sec (100ms interval)
        const now = Date.now();
        if (cursor === null || now - lastHttpCursorTimeRef.current >= 100) {
          lastHttpCursorTimeRef.current = now;
          const payload = JSON.stringify(msg);
          const url = `/api/documents/${activeDocumentId}/collaboration/publish`;

          if (typeof navigator !== 'undefined' && navigator.sendBeacon && cursor !== null) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
          } else {
            fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
              keepalive: true,
            }).catch(() => {});
          }
        }
      });
    },
    [activeDocumentId, updateLocalCursor]
  );

  // Reset baseline refs when switching documents to avoid stale diff broadcasts
  useEffect(() => {
    prevElementsRef.current = elements;
    prevDiagramSourceRef.current = diagramSource;
    prevSelectedIdsRef.current = selectedIds;
  }, [activeDocumentId]);

  // Micro-batched Local Whiteboard Elements Publisher (Delta Patch Optimized)
  useEffect(() => {
    if (isRemoteWhiteboardUpdateRef.current || isDocumentLoading) {
      prevElementsRef.current = elements;
      return;
    }

    const prevEls = prevElementsRef.current;
    if (elements !== prevEls) {
      prevElementsRef.current = elements;

      const localUser = useCollaborationStore.getState().localUser;
      if (!localUser || !activeDocumentId) return;

      // Delta patch optimization: if element count is identical, compute delta diffs
      let msg: CollaborationMessage;
      if (elements.length === prevEls.length && prevEls.length > 0) {
        const prevMap = new Map(prevEls.map((e) => [e.id, e]));
        const patches: Array<{ id: string; x?: number; y?: number; width?: number; height?: number; label?: string; isLocked?: boolean }> = [];

        for (const el of elements) {
          const prev = prevMap.get(el.id);
          if (prev && prev !== el) {
            patches.push({
              id: el.id,
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              label: el.label,
              isLocked: el.isLocked,
            });
          }
        }

        if (patches.length > 0 && patches.length <= 8) {
          msg = {
            type: 'WHITEBOARD_UPDATE',
            senderId: localUser.id,
            documentId: activeDocumentId,
            timestamp: Date.now(),
            action: 'patch',
            patches,
          };
        } else {
          msg = {
            type: 'WHITEBOARD_UPDATE',
            senderId: localUser.id,
            documentId: activeDocumentId,
            timestamp: Date.now(),
            action: 'full',
            elements,
          };
        }
      } else {
        msg = {
          type: 'WHITEBOARD_UPDATE',
          senderId: localUser.id,
          documentId: activeDocumentId,
          timestamp: Date.now(),
          action: 'full',
          elements,
        };
      }

      broadcastMessage(msg);
    }
  }, [elements, activeDocumentId, isDocumentLoading, broadcastMessage]);

  // Diagram Source Code Publisher
  useEffect(() => {
    if (isRemoteDiagramUpdateRef.current || isDocumentLoading) {
      prevDiagramSourceRef.current = diagramSource;
      return;
    }

    if (diagramSource !== prevDiagramSourceRef.current) {
      prevDiagramSourceRef.current = diagramSource;

      const localUser = useCollaborationStore.getState().localUser;
      if (!localUser || !activeDocumentId) return;

      const msg: CollaborationMessage = {
        type: 'DIAGRAM_UPDATE',
        senderId: localUser.id,
        documentId: activeDocumentId,
        timestamp: Date.now(),
        source: diagramSource,
      };

      broadcastMessage(msg);
    }
  }, [diagramSource, activeDocumentId, isDocumentLoading, broadcastMessage]);

  // Selected Element Publisher
  useEffect(() => {
    if (isDocumentLoading) {
      prevSelectedIdsRef.current = selectedIds;
      return;
    }

    if (selectedIds !== prevSelectedIdsRef.current) {
      prevSelectedIdsRef.current = selectedIds;
      updateLocalSelection(selectedIds);

      const localUser = useCollaborationStore.getState().localUser;
      if (!localUser || !activeDocumentId) return;

      const msg: CollaborationMessage = {
        type: 'SELECTION_CHANGE',
        senderId: localUser.id,
        documentId: activeDocumentId,
        timestamp: Date.now(),
        selectedElementIds: selectedIds,
      };

      broadcastMessage(msg);
    }
  }, [selectedIds, activeDocumentId, isDocumentLoading, updateLocalSelection, broadcastMessage]);

  return {
    publishCursor,
  };
}
