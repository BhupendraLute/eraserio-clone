'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { useDocumentStore } from '@/lib/store/document-store';

interface ActionCardsGridProps {
  onOpenAIDiagramModal: () => void;
}

export function ActionCardsGrid({ onOpenAIDiagramModal }: ActionCardsGridProps) {
  const router = useRouter();
  const createDocument = useDocumentStore((s) => s.createDocument);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBlankFile = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const docId = await createDocument('Untitled File');
      router.push(`/workspace/${docId}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      {/* Card 1: Create a Blank File */}
      <button
        onClick={handleCreateBlankFile}
        disabled={isCreating}
        className="group relative flex flex-col items-center justify-center h-32 rounded-xl border border-zinc-800 bg-[#19191c]/80 hover:bg-zinc-800/70 hover:border-zinc-700 transition-all p-4 text-center cursor-pointer select-none shadow-sm hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 group-hover:bg-blue-600/20 text-zinc-300 group-hover:text-blue-400 mb-3 transition-colors">
          <Plus className="h-6 w-6" />
        </div>
        <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
          {isCreating ? 'Creating File...' : 'Create a Blank File'}
        </span>
      </button>

      {/* Card 2: Generate an AI Diagram */}
      <button
        onClick={onOpenAIDiagramModal}
        className="group relative flex flex-col items-center justify-center h-32 rounded-xl border border-zinc-800 bg-[#19191c]/80 hover:bg-zinc-800/70 hover:border-purple-500/40 transition-all p-4 text-center cursor-pointer select-none shadow-sm hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 group-hover:bg-purple-600/20 text-zinc-300 group-hover:text-purple-400 mb-3 transition-colors">
          <Sparkles className="h-6 w-6 text-purple-400" />
        </div>
        <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
          Generate an AI Diagram
        </span>
      </button>
    </div>
  );
}
