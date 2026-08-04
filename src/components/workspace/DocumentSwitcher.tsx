'use client';

import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '@/lib/store/document-store';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ChevronDown,
  Plus,
  Trash2,
  Cloud,
  CloudOff,
  Edit2,
  Share2,
  LogIn,
  Search,
  Globe,
} from 'lucide-react';
import { SyncStatusBadge } from '@/components/workspace/SyncStatusBadge';
import { DocumentDuplicateButton } from '@/components/whiteboard/DocumentDuplicateButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DocumentSwitcherProps {
  onOpenShare?: () => void;
}

export function DocumentSwitcher({ onOpenShare }: DocumentSwitcherProps) {
  const {
    documents,
    activeDocumentId,
    activeDocumentTitle,
    syncStatus,
    mode,
    fetchDocuments,
    createDocument,
    selectDocument,
    renameDocument,
    deleteDocument,
  } = useDocumentStore();

  const { status: authStatus } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(activeDocumentTitle);
  const [searchQuery, setSearchQuery] = useState('');

  const isSignedIn = authStatus === 'authenticated';

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const [renderedTitle, setRenderedTitle] = useState(activeDocumentTitle);
  if (renderedTitle !== activeDocumentTitle) {
    setRenderedTitle(activeDocumentTitle);
    setTitleInput(activeDocumentTitle);
  }

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (activeDocumentId && titleInput.trim() && titleInput !== activeDocumentTitle) {
      renameDocument(activeDocumentId, titleInput.trim());
    } else {
      setTitleInput(activeDocumentTitle);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="flex items-center gap-2">
      {/* Title & Rename Input */}
      {isEditing ? (
        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
          autoFocus
          className="h-7 w-44 rounded border bg-background px-2 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="group flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Click to rename"
        >
          <span className="max-w-[160px] truncate">{activeDocumentTitle}</span>
          <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
        </button>
      )}

      {/* Sync Status Badge */}
      <div className="hidden sm:flex items-center border-l pl-2 pr-1">
        <SyncStatusBadge mode={mode} syncStatus={syncStatus} />
      </div>

      {/* Documents Switcher Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-2">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground flex items-center justify-between pb-1.5">
            <span>Your Documents</span>
            {isSignedIn ? (
              <span title="Cloud Synced">
                <Cloud className="h-3.5 w-3.5 text-emerald-500" />
              </span>
            ) : (
              <span title="Guest Mode">
                <CloudOff className="h-3.5 w-3.5 text-amber-500" />
              </span>
            )}
          </DropdownMenuLabel>

          {/* Document Search Filter */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-full rounded-md border bg-muted/30 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:bg-background focus:ring-1 focus:ring-primary"
            />
          </div>

          <DropdownMenuSeparator className="-mx-2 mb-1" />

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredDocuments.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                {searchQuery ? 'No documents found' : 'No documents available'}
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <DropdownMenuItem
                  key={doc.id}
                  onClick={() => selectDocument(doc.id)}
                  className="flex items-center justify-between text-xs cursor-pointer rounded-md py-1.5"
                >
                  <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                    <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className={`truncate ${doc.id === activeDocumentId ? 'font-bold text-foreground' : ''}`}>
                      {doc.title}
                    </span>
                    {doc.isPublic && (
                      <span title="Publicly Shared">
                        <Globe className="h-3 w-3 text-purple-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    <DocumentDuplicateButton documentId={doc.id} size="icon" className="h-5 w-5" />
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>

          {!isSignedIn && (
            <>
              <DropdownMenuSeparator className="-mx-2 my-1" />
              <DropdownMenuItem
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Sign in to sync documents</span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator className="-mx-2 my-1" />

          <DropdownMenuItem
            onClick={() => createDocument()}
            className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Document</span>
          </DropdownMenuItem>

          {onOpenShare && (
            <DropdownMenuItem
              onClick={onOpenShare}
              className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5 text-purple-500" />
              <span>Share Document</span>
            </DropdownMenuItem>
          )}

          {activeDocumentId && documents.length > 1 && (
            <DropdownMenuItem
              onClick={() => deleteDocument(activeDocumentId)}
              className="flex items-center gap-2 text-xs text-destructive cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Current</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
