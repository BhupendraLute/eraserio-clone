'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  MoreHorizontal,
  ArrowUpDown,
  Folder,
  Archive,
  Copy,
  Trash2,
  Edit2,
  Share2,
  MessageSquare,
  Sparkles,
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
import { DeleteConfirmModal } from '@/components/dashboard/modals/DeleteConfirmModal';

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
  onOpenAIDiagramModal: () => void;
}

export function DocumentTable({
  documents,
  searchQuery,
  onOpenAIDiagramModal,
}: DocumentTableProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const renameDocument = useDocumentStore((s) => s.renameDocument);
  const duplicateDocument = useDocumentStore((s) => s.duplicateDocument);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const archiveDocument = useDocumentStore((s) => s.archiveDocument);
  const folders = useDocumentStore((s) => s.folders);
  const moveDocumentToFolder = useDocumentStore((s) => s.moveDocumentToFolder);
  const createDocument = useDocumentStore((s) => s.createDocument);

  const [sortAsc, setSortAsc] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deletingDoc, setDeletingDoc] = useState<DocumentMetadata | null>(null);

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

  const userAvatar = session?.user?.image;
  const userName = session?.user?.name || 'User';

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800/80 bg-[#161618] select-none">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800/80 bg-[#121214] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
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
            <th className="py-3 px-4 font-bold text-center">Comments</th>
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

              return (
                <tr
                  key={doc.id}
                  onClick={() => handleRowClick(doc.id)}
                  className="group hover:bg-zinc-800/40 transition-colors cursor-pointer text-zinc-300 hover:text-white"
                >
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

                  {/* Comments */}
                  <td className="py-3 px-4 text-center text-zinc-500 text-xs">
                    {doc.commentsCount || 0}
                  </td>

                  {/* Author */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center justify-center">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={userName}
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
                      <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800 text-zinc-200">
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
                        {folders.length > 0 && (
                          <>
                            <DropdownMenuSeparator className="bg-zinc-800" />
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
                          </>
                        )}

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

      {/* Confirmation Modal before Deleting */}
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
    </div>
  );
}
