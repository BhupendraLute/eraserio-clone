'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { EraserHeader } from '@/components/EraserHeader';
import { EraserWorkspace } from '@/components/workspace/EraserWorkspace';
import { ImportGuestDocsModal } from '@/components/auth/ImportGuestDocsModal';
import { useAuthSync } from '@/hooks/useAuthSync';
import { useAutoSave } from '@/hooks/useAutoSave';

export default function WhiteboardPage() {
  useAuthSync();
  useAutoSave();
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);

  useEffect(() => {
    setViewMode('canvas');
  }, [setViewMode]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <EraserHeader />
      <EraserWorkspace />
      <ImportGuestDocsModal />
    </div>
  );
}
