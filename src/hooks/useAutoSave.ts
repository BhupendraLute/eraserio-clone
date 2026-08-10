'use client';

import { useEffect, useRef } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDocumentStore } from '@/lib/store/document-store';

/**
 * Watches whiteboard elements, diagram source, and document mode.
 * Whenever any change, calls saveCurrentDocumentState() to persist
 * state to the database (debounced 500ms inside document-store).
 */
export function useAutoSave() {
  const elements = useWhiteboardStore((s) => s.elements);
  const diagramSource = useDiagramStore((s) => s.source);
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId);
  const mode = useDocumentStore((s) => s.mode);
  const saveCurrentDocumentState = useDocumentStore((s) => s.saveCurrentDocumentState);

  // Skip initial mount render to avoid saving default state before hydration
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!activeDocumentId || mode === 'offline') return;

    saveCurrentDocumentState({
      whiteboardData: JSON.stringify(elements),
      diagramSource,
    });
  }, [elements, diagramSource, activeDocumentId, mode, saveCurrentDocumentState]);
}
