'use client';

import React, { useState, useEffect } from 'react';
import { useDocumentStore } from '@/lib/store/document-store';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ChevronDown,
  Plus,
  Trash2,
  Cloud,
  CloudOff,
  CheckCircle2,
  Loader2,
  Edit2,
  Share2,
} from 'lucide-react';
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

  const [isEditing, setIsEditing] = useState(false);
  const [titleInput, setTitleInput] = useState(activeDocumentTitle);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setTitleInput(activeDocumentTitle);
  }, [activeDocumentTitle]);

  const handleTitleSubmit = () => {
    setIsEditing(false);
    if (activeDocumentId && titleInput.trim() && titleInput !== activeDocumentTitle) {
      renameDocument(activeDocumentId, titleInput.trim());
    } else {
      setTitleInput(activeDocumentTitle);
    }
  };

  const renderSyncBadge = () => {
    switch (syncStatus) {
      case 'saving':
        return (
          <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </span>
        );
      case 'synced':
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>{mode === 'cloud' ? 'Saved' : 'Local'}</span>
          </span>
        );
      case 'error':
      case 'offline':
        return (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CloudOff className="h-3 w-3" />
            <span>Offline</span>
          </span>
        );
    }
  };

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
        {renderSyncBadge()}
      </div>

      {/* Documents Switcher Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>Your Documents</span>
            <Cloud className="h-3 w-3" />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <div className="max-h-48 overflow-y-auto">
            {documents.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No saved documents yet</div>
            ) : (
              documents.map((doc) => (
                <DropdownMenuItem
                  key={doc.id}
                  onClick={() => selectDocument(doc.id)}
                  className="flex items-center justify-between text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <span className={doc.id === activeDocumentId ? 'font-bold text-foreground' : ''}>
                      {doc.title}
                    </span>
                  </div>
                  {doc.id === activeDocumentId && (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </div>

          <DropdownMenuSeparator />

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
