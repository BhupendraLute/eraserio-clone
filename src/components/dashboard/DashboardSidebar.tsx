'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Lock,
  Archive,
  Plus,
  Sparkles,
  Palette,
  Code2,
  Bot,
  ChevronDown,
  Folder,
  Layers,
} from 'lucide-react';
import { useDocumentStore } from '@/lib/store/document-store';
import { useSession } from 'next-auth/react';
import { UserNav } from '@/components/auth/UserNav';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DashboardSidebarProps {
  currentTab: string;
  onOpenCreateFolder: () => void;
  onOpenAIDiagramModal: () => void;
}

export function DashboardSidebar({
  currentTab,
  onOpenCreateFolder,
  onOpenAIDiagramModal,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const createDocument = useDocumentStore((s) => s.createDocument);
  const folders = useDocumentStore((s) => s.folders);
  const [isCreating, setIsCreating] = useState(false);

  const userName = session?.user?.name || "Bhupendra's";

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
    <aside className="w-64 flex-shrink-0 border-r border-zinc-800 bg-[#121214] text-zinc-300 flex flex-col justify-between h-screen sticky top-0 select-none">
      {/* Top Workspace & Primary Nav */}
      <div className="flex flex-col gap-6 p-4">
        {/* Workspace Switcher Header */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors text-left group outline-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-6 w-6 rounded bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-extrabold text-xs shadow-md">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-sm text-zinc-100 truncate">
                {userName} Team
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-zinc-200 transition-colors flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200">
            <DropdownMenuLabel className="text-xs text-zinc-400">Workspaces</DropdownMenuLabel>
            <DropdownMenuItem className="focus:bg-zinc-800 font-semibold cursor-pointer">
              {userName} Team (Current)
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={() => router.push('/settings/workspace')}
              className="focus:bg-zinc-800 text-xs cursor-pointer text-blue-400"
            >
              + Create or Manage Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Main Nav Items */}
        <nav className="space-y-1">
          <Link
            href="/dashboard/all"
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'all'
                ? 'bg-zinc-800/80 text-white font-bold'
                : 'hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-zinc-400" />
              <span>All Files</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Alt A</span>
          </Link>

          <Link
            href="/dashboard/private"
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'private'
                ? 'bg-zinc-800/80 text-white font-bold'
                : 'hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-zinc-400" />
              <span>Private Files</span>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
              UPGRADE
            </span>
          </Link>

          <Link
            href="/dashboard/archive"
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              currentTab === 'archive'
                ? 'bg-zinc-800/80 text-white font-bold'
                : 'hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Archive className="h-4 w-4 text-zinc-400" />
              <span>Archive</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">F</span>
          </Link>
        </nav>

        {/* TEAM FOLDERS */}
        <div className="pt-2">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Team Folders
            </span>
            <button
              onClick={onOpenCreateFolder}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Create Folder"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 max-h-36 overflow-y-auto custom-scrollbar">
            {folders.length === 0 ? (
              <div className="px-3 py-1.5 text-[11px] text-zinc-600 italic">
                No folders created
              </div>
            ) : (
              folders.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/dashboard/folder-${folder.id}`}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    currentTab === `folder-${folder.id}`
                      ? 'bg-zinc-800/80 text-white font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Folder className="h-3.5 w-3.5 text-blue-400" />
                  <span className="truncate">{folder.name}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Shortcuts & New File Action */}
      <div className="p-4 border-t border-zinc-800/60 space-y-4">
        {/* Secondary Navigation Tools */}
        <div className="space-y-1">
          <button
            onClick={onOpenAIDiagramModal}
            className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>AI Presets</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">T</span>
          </button>

          <div className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs text-zinc-400 opacity-70">
            <div className="flex items-center gap-2.5">
              <Palette className="h-4 w-4 text-amber-400" />
              <span>Custom Styles</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">S</span>
          </div>

          <div className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs text-zinc-400 opacity-70">
            <div className="flex items-center gap-2.5">
              <Code2 className="h-4 w-4 text-cyan-400" />
              <span>MCP</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">C</span>
          </div>

          <div className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs text-zinc-400 opacity-70">
            <div className="flex items-center gap-2.5">
              <Bot className="h-4 w-4 text-emerald-400" />
              <span>Eraserbot</span>
              <span className="px-1 py-0.2 rounded bg-blue-900/60 text-blue-300 text-[8px] font-bold">
                BETA
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">R</span>
          </div>
        </div>

        {/* Primary Action Button: New File */}
        <DropdownMenu>
          <div className="flex w-full rounded-xl overflow-hidden shadow-lg border border-blue-500/30">
            <Button
              onClick={handleCreateBlankFile}
              disabled={isCreating}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-between px-4 rounded-r-none"
            >
              <span>{isCreating ? 'Creating...' : 'New File'}</span>
              <span className="text-[10px] text-blue-200 font-mono font-normal">Alt N</span>
            </Button>
            <DropdownMenuTrigger className="h-10 px-2 bg-blue-700 hover:bg-blue-600 text-white rounded-l-none border-l border-blue-500/40 flex items-center justify-center cursor-pointer outline-none">
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200">
            <DropdownMenuItem
              onClick={handleCreateBlankFile}
              className="focus:bg-zinc-800 cursor-pointer flex items-center gap-2 text-xs"
            >
              <FileText className="h-4 w-4 text-blue-400" />
              <span>Create Blank File</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onOpenAIDiagramModal}
              className="focus:bg-zinc-800 cursor-pointer flex items-center gap-2 text-xs text-purple-300"
            >
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Generate AI Diagram</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
