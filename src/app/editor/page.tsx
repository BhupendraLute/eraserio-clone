'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { EraserHeader } from '@/components/EraserHeader';
import { EraserWorkspace } from '@/components/workspace/EraserWorkspace';

export default function EditorPage() {
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);

  useEffect(() => {
    setViewMode('both');
  }, [setViewMode]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <EraserHeader />
      <EraserWorkspace />
    </div>
  );
}
