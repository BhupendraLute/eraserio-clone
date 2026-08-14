'use client';

import React, { useEffect, useRef } from 'react';
import { Search, Send, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/auth/UserNav';

interface DashboardHeaderProps {
  activeSubTab: 'all' | 'recents' | 'created-by-me' | 'folders' | 'unsorted';
  onSubTabChange: (tab: 'all' | 'recents' | 'created-by-me' | 'folders' | 'unsorted') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenInviteModal: () => void;
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
}

export function DashboardHeader({
  activeSubTab,
  onSubTabChange,
  searchQuery,
  onSearchChange,
  onOpenInviteModal,
  viewMode = 'table',
  onViewModeChange,
}: DashboardHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ctrl+K keybinding shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-[#121214] px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSubTabChange('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'all'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          All
        </button>
        <button
          onClick={() => onSubTabChange('recents')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'recents'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          Recents
        </button>
        <button
          onClick={() => onSubTabChange('created-by-me')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'created-by-me'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          Created by Me
        </button>
        <button
          onClick={() => onSubTabChange('folders')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'folders'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          Folders
        </button>
        <button
          onClick={() => onSubTabChange('unsorted')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeSubTab === 'unsorted'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          Unsorted
        </button>
      </div>

      {/* Search & View Mode & Team Presence & Invite Button */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-12 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[9px] font-mono text-zinc-400">
              Ctrl K
            </kbd>
          </div>
        </div>

        {/* View Mode Toggle (Table / Grid) */}
        {onViewModeChange && (
          <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-0.5">
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Invite Button */}
        <Button
          onClick={onOpenInviteModal}
          size="sm"
          className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 rounded-lg shadow-sm"
        >
          <Send className="h-3 w-3" />
          <span>Invite</span>
        </Button>

        {/* User Profile & Account Dropdown Tab */}
        <div className="border-l border-zinc-800 pl-3">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
