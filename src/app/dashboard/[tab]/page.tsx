'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocumentStore } from '@/lib/store/document-store';
import { useAuthSync } from '@/hooks/useAuthSync';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ActionCardsGrid } from '@/components/dashboard/ActionCardsGrid';
import { DocumentTable } from '@/components/dashboard/DocumentTable';
import { AIDiagramModal } from '@/components/dashboard/modals/AIDiagramModal';
import { CreateFolderModal } from '@/components/dashboard/modals/CreateFolderModal';
import { InviteTeamModal } from '@/components/dashboard/modals/InviteTeamModal';

export default function DashboardTabPage() {
  useAuthSync();
  const params = useParams();
  const router = useRouter();

  const tabParam = (params?.tab as string) || 'all';
  const documents = useDocumentStore((s) => s.documents);
  const fetchDocuments = useDocumentStore((s) => s.fetchDocuments);

  const [subTab, setSubTab] = useState<'all' | 'recents' | 'created-by-me' | 'folders' | 'unsorted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  // Filter documents based on sidebar tabParam + header subTab
  let displayedDocs = documents;

  if (tabParam === 'archive') {
    displayedDocs = documents.filter((d) => d.isArchived);
  } else if (tabParam === 'private') {
    displayedDocs = documents.filter((d) => d.isPrivate);
  } else if (tabParam.startsWith('folder-')) {
    const folderId = tabParam.replace('folder-', '');
    displayedDocs = documents.filter((d) => d.folderId === folderId && !d.isArchived);
  } else {
    // Normal active files (not archived)
    displayedDocs = documents.filter((d) => !d.isArchived);
  }

  // Apply Subtab filters
  if (subTab === 'recents') {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    displayedDocs = displayedDocs.filter((d) => new Date(d.updatedAt).getTime() > oneWeekAgo);
  } else if (subTab === 'folders') {
    displayedDocs = displayedDocs.filter((d) => !!d.folderId);
  } else if (subTab === 'unsorted') {
    displayedDocs = displayedDocs.filter((d) => !d.folderId);
  }

  return (
    <div className="flex h-screen w-full bg-[#121214] text-zinc-100 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <DashboardSidebar
        currentTab={tabParam}
        onOpenCreateFolder={() => setFolderModalOpen(true)}
        onOpenAIDiagramModal={() => setAiModalOpen(true)}
      />

      {/* Main Dashboard Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-[#121214]">
        {/* Header Bar */}
        <DashboardHeader
          activeSubTab={subTab}
          onSubTabChange={setSubTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenInviteModal={() => setInviteModalOpen(true)}
        />

        {/* Content Container */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Action Cards Grid */}
          <ActionCardsGrid onOpenAIDiagramModal={() => setAiModalOpen(true)} />

          {/* Documents Table */}
          <DocumentTable
            documents={displayedDocs}
            searchQuery={searchQuery}
            onOpenAIDiagramModal={() => setAiModalOpen(true)}
          />
        </div>
      </main>

      {/* Modals */}
      <AIDiagramModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
      <CreateFolderModal open={folderModalOpen} onOpenChange={setFolderModalOpen} />
      <InviteTeamModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
    </div>
  );
}
