'use client';

import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Share2,
  Search,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { WorkspaceViewMode } from '@/lib/store/workspace-store';
import { ThemeToggle } from '@/components/whiteboard/ThemeToggle';
import { CommandPalette } from '@/components/whiteboard/CommandPalette';
import { DocumentSwitcher } from '@/components/workspace/DocumentSwitcher';
import { UserNav } from '@/components/auth/UserNav';
import { ShareModal } from '@/components/workspace/ShareModal';

export function EraserHeader() {
  const viewMode = useWorkspaceStore((s) => s.viewMode);
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);
  const aiChatOpen = useWorkspaceStore((s) => s.aiChatOpen);
  const toggleAiChat = useWorkspaceStore((s) => s.toggleAiChat);

  const showComments = useWhiteboardStore((s) => s.showComments);
  const toggleShowComments = useWhiteboardStore((s) => s.toggleShowComments);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Global Ctrl+K / Cmd+K (command palette) + Ctrl+J / Cmd+J (AI chat) handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        toggleAiChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAiChat]);

  const viewOptions: { mode: WorkspaceViewMode; label: string }[] = [
    { mode: 'document', label: 'Document' },
    { mode: 'both', label: 'Both' },
    { mode: 'canvas', label: 'Canvas' },
  ];

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b bg-background px-3 select-none">
      {/* Left: Brand Icon & Document Switcher */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm font-bold text-xs">
          A
        </div>
        <DocumentSwitcher onOpenShare={() => setShareModalOpen(true)} />
      </div>

      {/* Center: Eraser View Switcher [ Document | Both | Canvas ] */}
      <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 shadow-inner">
        {viewOptions.map((opt) => (
          <button
            key={opt.mode}
            onClick={() => setViewMode(opt.mode)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-all',
              viewMode === opt.mode
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Right: Actions & User Account */}
      <div className="flex items-center gap-2">
        {/* Command Palette (Ctrl+K) */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-muted-foreground gap-1.5 px-2"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="h-3 w-3" />
          <span className="hidden sm:inline">Commands</span>
          <kbd className="rounded bg-muted px-1 py-0.5 text-[9px] font-medium">Ctrl+K</kbd>
        </Button>

        {/* GitHub Repository Link */}
        <a
          href="https://github.com/BhupendraLute/eraserio-clone"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex h-7 items-center justify-center rounded-md border px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="GitHub Repository"
        >
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>

        {/* Share Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5 px-2.5"
          onClick={() => setShareModalOpen(true)}
        >
          <Share2 className="h-3 w-3" />
          <span>Share</span>
        </Button>

        {/* ✨ AI Chat Button */}
        <Button
          variant={aiChatOpen ? 'secondary' : 'default'}
          size="sm"
          className="h-7 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 shadow-sm"
          onClick={toggleAiChat}
        >
          <Sparkles className="h-3 w-3 text-amber-300" />
          <span>Architecta AI</span>
        </Button>

        {/* 💬 Comment Visibility Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleShowComments}
          className={cn(
            'h-7 w-7 transition-colors rounded-md border',
            showComments
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          title={showComments ? 'Hide comments on canvas' : 'Show comments on canvas'}
        >
          <MessageSquare className="h-3.5 w-3.5 fill-current" />
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Account / Navigation */}
        <UserNav />

        {/* Settings Link */}
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

      {/* Share Modal */}
      <ShareModal open={shareModalOpen} onOpenChange={setShareModalOpen} />
    </header>
  );
}
