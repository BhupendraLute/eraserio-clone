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

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          E
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
          <span>Eraser AI</span>
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
