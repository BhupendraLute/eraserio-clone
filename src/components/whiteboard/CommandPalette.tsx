'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useTheme } from 'next-themes';
import { Search, Sun, Moon, Monitor, MousePointer, Square, Circle, Diamond, Database, MoveRight, Minus, Pencil, Type, StickyNote, Frame, MessageSquare, Eraser, Hash, Undo2, Redo2, Copy, Clipboard, Group, Ungroup, Settings, Trash2, Grid3X3, Download, Save, HelpCircle } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  action: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setTheme } = useTheme();

  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const undo = useWhiteboardStore((s) => s.undo);
  const redo = useWhiteboardStore((s) => s.redo);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const copyToClipboard = useWhiteboardStore((s) => s.copyToClipboard);
  const pasteFromClipboard = useWhiteboardStore((s) => s.pasteFromClipboard);
  const groupSelected = useWhiteboardStore((s) => s.groupSelected);
  const ungroupSelected = useWhiteboardStore((s) => s.ungroupSelected);
  const setShowGrid = useWhiteboardStore((s) => s.setShowGrid);
  const showGrid = useWhiteboardStore((s) => s.showGrid);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands: Command[] = [
    // Tools
    { id: 'tool-select', label: 'Select Tool', shortcut: 'V', icon: MousePointer, category: 'Tools', action: () => setActiveTool('select') },
    { id: 'tool-rectangle', label: 'Rectangle', shortcut: 'R', icon: Square, category: 'Tools', action: () => setActiveTool('rectangle') },
    { id: 'tool-circle', label: 'Circle', shortcut: 'O', icon: Circle, category: 'Tools', action: () => setActiveTool('circle') },
    { id: 'tool-diamond', label: 'Diamond', shortcut: 'D', icon: Diamond, category: 'Tools', action: () => setActiveTool('diamond') },
    { id: 'tool-cylinder', label: 'Cylinder', shortcut: 'Y', icon: Database, category: 'Tools', action: () => setActiveTool('cylinder') },
    { id: 'tool-arrow', label: 'Arrow', shortcut: 'A', icon: MoveRight, category: 'Tools', action: () => setActiveTool('arrow') },
    { id: 'tool-line', label: 'Line', shortcut: 'L', icon: Minus, category: 'Tools', action: () => setActiveTool('line') },
    { id: 'tool-pencil', label: 'Pencil', shortcut: 'P', icon: Pencil, category: 'Tools', action: () => setActiveTool('pencil') },
    { id: 'tool-text', label: 'Text', shortcut: 'T', icon: Type, category: 'Tools', action: () => setActiveTool('text') },
    { id: 'tool-sticky', label: 'Sticky Note', shortcut: 'N', icon: StickyNote, category: 'Tools', action: () => setActiveTool('sticky') },
    { id: 'tool-frame', label: 'Frame', shortcut: 'F', icon: Frame, category: 'Tools', action: () => setActiveTool('frame') },
    { id: 'tool-comment', label: 'Comment', shortcut: 'C', icon: MessageSquare, category: 'Tools', action: () => setActiveTool('comment') },
    { id: 'tool-eraser', label: 'Eraser', shortcut: 'E', icon: Eraser, category: 'Tools', action: () => setActiveTool('eraser') },
    { id: 'tool-badge', label: 'Badge', shortcut: 'B', icon: Hash, category: 'Tools', action: () => setActiveTool('badge') },
    // Actions
    { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', icon: Undo2, category: 'Actions', action: () => undo() },
    { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', icon: Redo2, category: 'Actions', action: () => redo() },
    { id: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D', icon: Copy, category: 'Actions', action: () => duplicateSelected() },
    { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', icon: Copy, category: 'Actions', action: () => copyToClipboard() },
    { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', icon: Clipboard, category: 'Actions', action: () => pasteFromClipboard() },
    { id: 'group', label: 'Group', shortcut: 'Ctrl+G', icon: Group, category: 'Actions', action: () => groupSelected() },
    { id: 'ungroup', label: 'Ungroup', shortcut: 'Ctrl+Shift+G', icon: Ungroup, category: 'Actions', action: () => ungroupSelected() },
    { id: 'delete', label: 'Delete Selected', shortcut: 'Del', icon: Trash2, category: 'Actions', action: () => deleteElements(selectedIds) },
    { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', icon: MousePointer, category: 'Actions', action: () => { useWhiteboardStore.getState().setSelectedIds(useWhiteboardStore.getState().elements.map((el) => el.id)); } },
    // View
    { id: 'toggle-grid', label: `${showGrid ? 'Hide' : 'Show'} Grid`, shortcut: '', icon: Grid3X3, category: 'View', action: () => setShowGrid(!showGrid) },
    { id: 'theme-light', label: 'Light Theme', shortcut: '', icon: Sun, category: 'View', action: () => setTheme('light') },
    { id: 'theme-dark', label: 'Dark Theme', shortcut: '', icon: Moon, category: 'View', action: () => setTheme('dark') },
    { id: 'theme-system', label: 'System Theme', shortcut: '', icon: Monitor, category: 'View', action: () => setTheme('system') },
    // Navigation
    { id: 'nav-settings', label: 'Settings / Shortcuts', shortcut: '', icon: Settings, category: 'Navigation', action: () => router.push('/settings') },
    { id: 'nav-whiteboard', label: 'Go to Whiteboard', shortcut: '', icon: MousePointer, category: 'Navigation', action: () => router.push('/whiteboard') },
  ];

  const filtered = query.trim()
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase()) ||
        cmd.category.toLowerCase().includes(query.toLowerCase()) ||
        cmd.shortcut?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIndex, onClose]);

  // Group results by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.category] ??= []).push(cmd);
    return acc;
  }, {});

  let flatIndex = 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-xl border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} className="mb-2">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </div>
              {cmds.map((cmd) => {
                const isSelected = flatIndex === selectedIndex;
                const currentIndex = flatIndex;
                flatIndex++;
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
                    }`}
                    onClick={() => { cmd.action(); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
