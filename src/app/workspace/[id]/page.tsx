'use client';

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useDocumentStore } from '@/lib/store/document-store';
import { EraserHeader } from '@/components/EraserHeader';
import { EraserWorkspace } from '@/components/workspace/EraserWorkspace';
import { ImportGuestDocsModal } from '@/components/auth/ImportGuestDocsModal';
import { useAuthSync } from '@/hooks/useAuthSync';
import { useAutoSave } from '@/hooks/useAutoSave';

export default function WorkspaceDocumentPage() {
  useAuthSync();
  useAutoSave();
  const params = useParams();
  const docId = params?.id as string | undefined;

  const setViewMode = useWorkspaceStore((s) => s.setViewMode);
  const hydrate = useWhiteboardStore((s) => s.hydrate);
  const selectDocument = useDocumentStore((s) => s.selectDocument);
  const activeDocumentId = useDocumentStore((s) => s.activeDocumentId);

  useEffect(() => {
    setViewMode('canvas');
  }, [setViewMode]);

  useEffect(() => {
    if (docId && docId !== activeDocumentId) {
      void selectDocument(docId);
    }
  }, [docId, activeDocumentId, selectDocument]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <EraserHeader />
      <EraserWorkspace />
      <ImportGuestDocsModal />
    </div>
  );
}
