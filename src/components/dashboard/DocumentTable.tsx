'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FileText,
  MoreHorizontal,
  ArrowUpDown,
  Folder,
  Archive,
  Copy,
  Trash2,
  Edit2,
  Sparkles,
  CheckSquare,
  Square,
  FolderInput,
  X,
  Layers,
} from 'lucide-react';
import { useDocumentStore, DocumentMetadata } from '@/lib/store/document-store';
import { useSession } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { DeleteConfirmModal } from '@/components/dashboard/modals/DeleteConfirmModal';
import { DocumentTableSkeleton, DocumentGridSkeleton } from '@/components/dashboard/skeletons';

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
  } catch {
    return 'recently';
  }
}

interface DocumentTableProps {
  documents: DocumentMetadata[];
  searchQuery: string;
  viewMode?: 'table' | 'grid';
  onOpenAIDiagramModal: () => void;
}

export function DocumentTable({
  documents,
  searchQuery,
  viewMode = 'table',
  onOpenAIDiagramModal,
}: DocumentTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const duplicateDocument = useDocumentStore((s) => s.duplicateDocument);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const archiveDocument = useDocumentStore((s) => s.archiveDocument);
  const batchDeleteDocuments = useDocumentStore((s) => s.batchDeleteDocuments);
  const batchArchiveDocuments = useDocumentStore((s) => s.batchArchiveDocuments);
  const batchMoveDocumentsToFolder = useDocumentStore((s) => s.batchMoveDocumentsToFolder);
  const folders = useDocumentStore((s) => s.folders);
  const moveDocumentToFolder = useDocumentStore((s) => s.moveDocumentToFolder);
  const createDocument = useDocumentStore((s) => s.createDocument);
  const isLoading = useDocumentStore((s) => s.isLoading);

  const [sortAsc, setSortAsc] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deletingDoc, setDeletingDoc] = useState<DocumentMetadata | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const filtered = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return sortAsc ? timeA - timeB : timeB - timeA;
  });

  const handleRowClick = (docId: string) => {
    router.push(`/workspace/${docId}`);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((d) => d.id)));
    }
  };

  const handleToggleSelectDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartRename = (doc: DocumentMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(doc.id);
    setRenameTitle(doc.title);
  };

  const handleSaveRename = async (docId: string) => {
    if (renameTitle.trim()) {
      await renameDocument(docId, renameTitle.trim());
    }
    setRenamingId(null);
  };

  const handleDuplicate = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = await duplicateDocument(docId);
    if (newId) {
      router.push(`/workspace/${newId}`);
    }
  };

  const handlePromptDelete = (doc: DocumentMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingDoc(doc);
  };

  const handleArchiveToggle = async (doc: DocumentMetadata, e: React.MouseEvent) => {
    e.stopPropagation();
    await archiveDocument(doc.id, !doc.isArchived);
  };

  // Batch actions
  const handleBatchArchive = async (archive = true) => {
    const ids = Array.from(selectedIds);
    await batchArchiveDocuments(ids, archive);
    setSelectedIds(new Set());
  };

  const handleBatchMove = (folderId: string | null) => {
    const ids = Array.from(selectedIds);
    batchMoveDocumentsToFolder(ids, folderId);
    setSelectedIds(new Set());
  };

  const handleBatchDeleteConfirm = async () => {
    const ids = Array.from(selectedIds);
    await batchDeleteDocuments(ids);
    setSelectedIds(new Set());
    setIsBatchDeleting(false);
  };

  const userAvatar = session?.user?.image;
  const userName = session?.user?.name || 'User';
  const allSelected = sorted.length > 0 && selectedIds.size === sorted.length;

  if (isLoading) {
    return viewMode === 'grid' ? <DocumentGridSkeleton /> : <DocumentTableSkeleton />;
  }

  return (
    <div className="relative w-full select-none">
      {/* Floating Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-blue-500/40 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 border-r border-zinc-800 pr-3">
            <span className="h-5 w-5 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold text-zinc-200">Selected</span>
          </div>

          {/* Move to Folder */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5 px-3 rounded-xl transition-colors cursor-pointer outline-none">
              <FolderInput className="h-3.5 w-3.5 text-blue-400" />
              <span>Move to...</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52 bg-zinc-900 border-zinc-800 text-zinc-200 shadow-xl">
              <DropdownMenuItem
                onClick={() => handleBatchMove(null)}
                className="focus:bg-zinc-800 cursor-pointer text-xs"
              >
                <Layers className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                <span>Unsorted (Root)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {folders.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onClick={() => handleBatchMove(f.id)}
                  className="focus:bg-zinc-800 cursor-pointer text-xs"
                >
                  <Folder className="h-3.5 w-3.5 mr-2 text-blue-400" />
                  <span className="truncate">{f.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Archive / Unarchive */}
          <Button
            variant="ghost"
            onClick={() => handleBatchArchive(true)}
            className="h-8 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5 px-3 rounded-xl"
          >
            <Archive className="h-3.5 w-3.5 text-amber-400" />
            <span>Archive</span>
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            onClick={() => setIsBatchDeleting(true)}
            className="h-8 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-1.5 px-3 rounded-xl"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>

          {/* Clear */}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Clear Selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* View Mode: Grid Cards */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-500 rounded-xl border border-zinc-800/80 bg-[#161618]">
              <div className="flex flex-col items-center justify-center space-y-3">
                <FileText className="h-8 w-8 text-zinc-600" />
                <div className="text-sm font-semibold text-zinc-300">No documents found</div>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Create a new document or generate an architecture diagram with AI.
                </p>
              </div>
            </div>
          ) : (
            sorted.map((doc) => {
              const folderName = folders.find((f) => f.id === doc.folderId)?.name;
              const isSelected = selectedIds.has(doc.id);

              return (
                <div
                  key={doc.id}
                  onClick={() => handleRowClick(doc.id)}
                  className={`group relative rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between h-44 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/20'
                      : 'border-zinc-800/80 bg-[#161618] hover:border-zinc-700 hover:bg-zinc-800/30'
                  }`}
                >
                  {/* Card Header with Checkbox & Dropdown */}
                  <div className="flex items-start justify-between">
                    <button
                      onClick={(e) => handleToggleSelectDoc(doc.id, e)}
                      className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Square className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      {folderName && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-semibold flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          <span className="truncate max-w-[80px]">{folderName}</span>
                        </span>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors outline-none"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800 text-zinc-200 shadow-xl">
                          <DropdownMenuItem
                            onClick={() => handleRowClick(doc.id)}
                            className="focus:bg-zinc-800 cursor-pointer text-xs"
                          >
                            <FileText className="h-3.5 w-3.5 mr-2 text-blue-400" />
                            <span>Open Canvas</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleStartRename(doc, e)}
                            className="focus:bg-zinc-800 cursor-pointer text-xs"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-2 text-amber-400" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleDuplicate(doc.id, e)}
                            className="focus:bg-zinc-800 cursor-pointer text-xs"
                          >
                            <Copy className="h-3.5 w-3.5 mr-2 text-purple-400" />
                            <span>Duplicate</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-zinc-800" />
                          <DropdownMenuItem
                            onClick={(e) => handleArchiveToggle(doc, e)}
                            className="focus:bg-zinc-800 cursor-pointer text-xs"
                          >
                            <Archive className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                            <span>{doc.isArchived ? 'Unarchive' : 'Archive'}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handlePromptDelete(doc, e)}
                            className="focus:bg-zinc-800 cursor-pointer text-xs text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Card Title & Icon */}
                  <div className="space-y-1.5 my-2">
                    <div className="h-8 w-8 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center">
                      <FileText className="h-4 w-4" />
                    </div>
                    {renamingId === doc.id ? (
                      <input
                        type="text"
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onBlur={() => handleSaveRename(doc.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(doc.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="px-2 py-0.5 rounded bg-zinc-900 border border-blue-500 text-xs text-white focus:outline-none w-full"
                      />
                    ) : (
                      <div className="font-bold text-sm text-zinc-100 group-hover:text-white truncate">
                        {doc.title}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                    <span>{formatRelativeTime(doc.updatedAt)}</span>
                    <div className="flex items-center gap-1.5">
                      {userAvatar ? (
                        <Image
                          src={userAvatar}
                          alt={userName}
                          width={16}
                          height={16}
                          unoptimized
                          className="h-4 w-4 rounded-full object-cover ring-1 ring-zinc-700"
                        />
                      ) : (
                        <div className="h-4 w-4 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* View Mode: Table View */
        <div className="w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-[#161618]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-[#121214] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    className="p-1 rounded text-zinc-500 hover:text-white transition-colors"
                  >
                    {allSelected ? (
                      <CheckSquare className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-bold">Name</th>
                <th className="py-3 px-4 font-bold">Location</th>
                <th className="py-3 px-4 font-bold">Created</th>
                <th className="py-3 px-4 font-bold">
                  <button
                    onClick={() => setSortAsc(!sortAsc)}
                    className="flex items-center gap-1 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <span>Edited</span>
                    <ArrowUpDown className="h-3 w-3 text-zinc-400" />
                  </button>
                </th>
                <th className="py-3 px-4 font-bold text-center">Author</th>
                <th className="py-3 px-4 font-bold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 text-xs">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <FileText className="h-8 w-8 text-zinc-600" />
                      <div className="text-sm font-semibold text-zinc-300">No documents found</div>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        Create a new document or generate an architecture diagram with AI to get started.
                      </p>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={async () => {
                            const newId = await createDocument('Untitled File');
                            router.push(`/workspace/${newId}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                        >
                          + Create Blank File
                        </button>
                        <button
                          onClick={onOpenAIDiagramModal}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-purple-300 font-bold text-xs flex items-center gap-1.5 border border-purple-500/30"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                          <span>AI Diagram</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((doc) => {
                  const folderName = folders.find((f) => f.id === doc.folderId)?.name || '—';
                  const createdDate = formatRelativeTime(doc.createdAt);
                  const editedDate = formatRelativeTime(doc.updatedAt);
                  const isSelected = selectedIds.has(doc.id);

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleRowClick(doc.id)}
                      className={`group transition-colors cursor-pointer text-zinc-300 hover:text-white ${
                        isSelected ? 'bg-blue-950/20' : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center" onClick={(e) => handleToggleSelectDoc(doc.id, e)}>
                        <button className="p-1 rounded text-zinc-500 hover:text-white transition-colors">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Square className="h-4 w-4 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* Title / Name */}
                      <td className="py-3 px-4 font-medium max-w-xs">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          {renamingId === doc.id ? (
                            <input
                              type="text"
                              value={renameTitle}
                              onChange={(e) => setRenameTitle(e.target.value)}
                              onBlur={() => handleSaveRename(doc.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(doc.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="px-2 py-0.5 rounded bg-zinc-900 border border-blue-500 text-xs text-white focus:outline-none w-full"
                            />
                          ) : (
                            <span className="truncate font-semibold text-zinc-200 group-hover:text-white">
                              {doc.title}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-zinc-500 text-xs">
                        <div className="flex items-center gap-1.5">
                          {doc.folderId && <Folder className="h-3 w-3 text-blue-400" />}
                          <span>{folderName}</span>
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-3 px-4 text-zinc-500 text-xs">{createdDate}</td>

                      {/* Edited */}
                      <td className="py-3 px-4 text-zinc-400 text-xs font-medium">{editedDate}</td>

                      {/* Author */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          {userAvatar ? (
                            <Image
                              src={userAvatar}
                              alt={userName}
                              width={20}
                              height={20}
                              unoptimized
                              className="h-5 w-5 rounded-full object-cover ring-1 ring-zinc-700"
                            />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                              {userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions Dropdown */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors outline-none cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-800 text-zinc-200 shadow-xl">
                            <DropdownMenuItem
                              onClick={() => handleRowClick(doc.id)}
                              className="focus:bg-zinc-800 cursor-pointer text-xs"
                            >
                              <FileText className="h-3.5 w-3.5 mr-2 text-blue-400" />
                              <span>Open Canvas</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleStartRename(doc, e)}
                              className="focus:bg-zinc-800 cursor-pointer text-xs"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2 text-amber-400" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleDuplicate(doc.id, e)}
                              className="focus:bg-zinc-800 cursor-pointer text-xs"
                            >
                              <Copy className="h-3.5 w-3.5 mr-2 text-purple-400" />
                              <span>Duplicate</span>
                            </DropdownMenuItem>

                            {/* Move to Folder Submenu */}
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            {doc.folderId && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveDocumentToFolder(doc.id, null);
                                }}
                                className="focus:bg-zinc-800 cursor-pointer text-xs flex items-center text-zinc-400"
                              >
                                <Layers className="h-3.5 w-3.5 mr-2" />
                                <span>Remove from folder</span>
                              </DropdownMenuItem>
                            )}
                            {folders.map((f) => (
                              <DropdownMenuItem
                                key={f.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveDocumentToFolder(doc.id, f.id);
                                }}
                                className="focus:bg-zinc-800 cursor-pointer text-xs flex items-center"
                              >
                                <Folder className="h-3.5 w-3.5 mr-2 text-blue-400" />
                                <span className="truncate">Move to {f.name}</span>
                              </DropdownMenuItem>
                            ))}

                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={(e) => handleArchiveToggle(doc, e)}
                              className="focus:bg-zinc-800 cursor-pointer text-xs"
                            >
                              <Archive className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                              <span>{doc.isArchived ? 'Unarchive' : 'Archive'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handlePromptDelete(doc, e)}
                              className="focus:bg-zinc-800 cursor-pointer text-xs text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={!!deletingDoc}
        onOpenChange={(open) => !open && setDeletingDoc(null)}
        documentTitle={deletingDoc?.title}
        onConfirm={async () => {
          if (deletingDoc) {
            await deleteDocument(deletingDoc.id);
            setDeletingDoc(null);
          }
        }}
      />

      {/* Batch Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={isBatchDeleting}
        onOpenChange={setIsBatchDeleting}
        documentTitle={`${selectedIds.size} selected documents`}
        onConfirm={handleBatchDeleteConfirm}
      />
    </div>
  );
}
