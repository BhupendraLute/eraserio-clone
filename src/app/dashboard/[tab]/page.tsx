'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Folder, Edit3, Trash2, Plus, Sparkles, Layers } from 'lucide-react';
import { useDocumentStore, DashboardFolder } from '@/lib/store/document-store';
import { useAuthSync } from '@/hooks/useAuthSync';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ActionCardsGrid } from '@/components/dashboard/ActionCardsGrid';
import { DocumentTable } from '@/components/dashboard/DocumentTable';
import { AIDiagramModal } from '@/components/dashboard/modals/AIDiagramModal';
import { CreateFolderModal } from '@/components/dashboard/modals/CreateFolderModal';
import { DeleteFolderModal } from '@/components/dashboard/modals/DeleteFolderModal';
import { InviteTeamModal } from '@/components/dashboard/modals/InviteTeamModal';
import { CreateWorkspaceModal } from '@/components/dashboard/modals/CreateWorkspaceModal';
import { ManageTeamModal } from '@/components/dashboard/modals/ManageTeamModal';
import { Button } from '@/components/ui/button';

export default function DashboardTabPage() {
  useAuthSync();
  const params = useParams();
  const router = useRouter();

  const tabParam = (params?.tab as string) || 'all';
  const documents = useDocumentStore((s) => s.documents);
  const folders = useDocumentStore((s) => s.folders);
  const fetchDocuments = useDocumentStore((s) => s.fetchDocuments);
  const deleteFolder = useDocumentStore((s) => s.deleteFolder);
  const createDocument = useDocumentStore((s) => s.createDocument);

  const [subTab, setSubTab] = useState<'all' | 'recents' | 'created-by-me' | 'folders' | 'unsorted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<DashboardFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<DashboardFolder | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [manageTeamOpen, setManageTeamOpen] = useState(false);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  // Identify active folder if browsing folder tab
  const currentFolderId = tabParam.startsWith('folder-') ? tabParam.replace('folder-', '') : null;
  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) : null;

  // Filter documents based on sidebar tabParam + header subTab
  let displayedDocs = documents;

  if (tabParam === 'archive') {
    displayedDocs = documents.filter((d) => d.isArchived);
  } else if (tabParam === 'private') {
    displayedDocs = documents.filter((d) => d.isPrivate);
  } else if (currentFolderId) {
    displayedDocs = documents.filter((d) => d.folderId === currentFolderId && !d.isArchived);
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

  const handleOpenCreateFolder = () => {
    setFolderToEdit(null);
    setFolderModalOpen(true);
  };

  const handleOpenEditFolder = (folder: DashboardFolder) => {
    setFolderToEdit(folder);
    setFolderModalOpen(true);
  };

  const handleOpenDeleteFolder = (folder: DashboardFolder) => {
    setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = (deleteContents: boolean) => {
    if (folderToDelete) {
      deleteFolder(folderToDelete.id, deleteContents);
      if (currentFolderId === folderToDelete.id) {
        router.push('/dashboard/all');
      }
      setFolderToDelete(null);
    }
  };

  const handleCreateDocumentInFolder = async () => {
    const docId = await createDocument('Untitled File', undefined, currentFolderId);
    router.push(`/workspace/${docId}`);
  };

  const folderDocCount = currentFolderId
    ? documents.filter((d) => d.folderId === currentFolderId && !d.isArchived).length
    : 0;

  return (
    <div className="flex h-screen w-full bg-[#121214] text-zinc-100 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <DashboardSidebar
        currentTab={tabParam}
        onOpenCreateFolder={handleOpenCreateFolder}
        onOpenEditFolder={handleOpenEditFolder}
        onOpenDeleteFolder={handleOpenDeleteFolder}
        onOpenAIDiagramModal={() => setAiModalOpen(true)}
        onOpenCreateWorkspaceModal={() => setCreateWorkspaceOpen(true)}
        onOpenManageTeamModal={() => setManageTeamOpen(true)}
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
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Content Container */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Active Folder Header Banner (if viewing a folder) */}
          {currentFolder && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#161618] border border-zinc-800/80 shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Folder className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>{currentFolder.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                      {folderDocCount} document{folderDocCount !== 1 ? 's' : ''}
                    </span>
                  </h1>
                  <p className="text-xs text-zinc-400">Team Folder</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditFolder(currentFolder)}
                  className="h-8 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5 rounded-lg"
                >
                  <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Rename</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenDeleteFolder(currentFolder)}
                  className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-1.5 rounded-lg"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Folder</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateDocumentInFolder}
                  className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 rounded-lg shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New File in Folder</span>
                </Button>
              </div>
            </div>
          )}

          {/* Action Cards Grid (only on main files view) */}
          {!currentFolder && tabParam === 'all' && (
            <ActionCardsGrid onOpenAIDiagramModal={() => setAiModalOpen(true)} />
          )}

          {/* Documents Table / Grid */}
          <DocumentTable
            documents={displayedDocs}
            searchQuery={searchQuery}
            viewMode={viewMode}
            onOpenAIDiagramModal={() => setAiModalOpen(true)}
          />
        </div>
      </main>

      {/* Modals */}
      <AIDiagramModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
      <CreateFolderModal
        open={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        folderToEdit={folderToEdit}
      />
      <DeleteFolderModal
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        folder={folderToDelete}
        documentsCount={
          folderToDelete
            ? documents.filter((d) => d.folderId === folderToDelete.id && !d.isArchived).length
            : 0
        }
        onConfirm={handleConfirmDeleteFolder}
      />
      <InviteTeamModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
      <CreateWorkspaceModal open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen} />
      <ManageTeamModal open={manageTeamOpen} onOpenChange={setManageTeamOpen} />
    </div>
  );
}
