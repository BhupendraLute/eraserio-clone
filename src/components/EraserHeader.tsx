'use client';

import React from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Share2,
  Search,
  MessageSquare,
  HelpCircle,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceViewMode } from '@/lib/store/workspace-store';

export function EraserHeader() {
  const viewMode = useWorkspaceStore((s) => s.viewMode);
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);
  const fileName = useWorkspaceStore((s) => s.fileName);
  const setFileName = useWorkspaceStore((s) => s.setFileName);
  const aiChatOpen = useWorkspaceStore((s) => s.aiChatOpen);
  const toggleAiChat = useWorkspaceStore((s) => s.toggleAiChat);

  const viewOptions: { mode: WorkspaceViewMode; label: string }[] = [
    { mode: 'document', label: 'Document' },
    { mode: 'both', label: 'Both' },
    { mode: 'canvas', label: 'Canvas' },
  ];

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b bg-background px-3 select-none">
      {/* Left: Brand Icon & File Title */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm font-bold text-xs">
          E
        </div>
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="bg-transparent text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 rounded px-1"
        />
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
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

      {/* Right: Actions (Search, Share, AI Chat, Help) */}
      <div className="flex items-center gap-2">
        {/* Ctrl+K Search */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-muted-foreground gap-1.5 px-2"
        >
          <Search className="h-3 w-3" />
          <span>Ctrl K</span>
        </Button>

        {/* Share Button */}
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2.5">
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
          <span>AI Chat</span>
        </Button>

        {/* Comments Button */}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
        </Button>

        {/* Zoom Indicator */}
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground font-medium px-1">
          <span>100%</span>
          <ChevronDown className="h-3 w-3" />
        </div>

        {/* Help Button */}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
