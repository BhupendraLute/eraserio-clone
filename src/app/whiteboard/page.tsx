'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { EraserHeader } from '@/components/EraserHeader';
import { EraserWorkspace } from '@/components/workspace/EraserWorkspace';
import { ImportGuestDocsModal } from '@/components/auth/ImportGuestDocsModal';
import { useAuthSync } from '@/hooks/useAuthSync';

export default function WhiteboardPage() {
  useAuthSync();
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);
  const hydrate = useWhiteboardStore((s) => s.hydrate);

  useEffect(() => {
    setViewMode('canvas');
  }, [setViewMode]);

  // Hydrate whiteboard elements from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <EraserHeader />
      <EraserWorkspace />
      <ImportGuestDocsModal />
    </div>
  );
}
