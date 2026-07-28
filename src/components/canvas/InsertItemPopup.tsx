'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  GitBranch,
  Shapes,
  Smile,
  Smartphone,
  Search,
  Image as ImageIcon,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import type { WhiteboardTool, CloudIconKind } from '@/lib/whiteboard/whiteboard-types';
import { useIconSearch } from '@/lib/hooks/useIconSearch';

const POPUP_SHAPE_GRID: { type: WhiteboardTool; label: string; icon: React.ReactNode }[] = [
  {
    type: 'rectangle',
    label: 'Rectangle',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="5" width="18" height="12" rx="3" />
      </svg>
    ),
  },
  {
    type: 'circle',
    label: 'Ellipse',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8.5" />
      </svg>
    ),
  },
  {
    type: 'diamond',
    label: 'Diamond',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="11,2 20,11 11,20 2,11" />
      </svg>
    ),
  },
  {
    type: 'triangle',
    label: 'Triangle',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="11,3 20,19 2,19" />
      </svg>
    ),
  },
  {
    type: 'capsule',
    label: 'Oval',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="7" width="18" height="8" rx="4" />
      </svg>
    ),
  },
  {
    type: 'parallelogram',
    label: 'Parallelogram',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="6,4 20,4 16,18 2,18" />
      </svg>
    ),
  },
  {
    type: 'trapezoid',
    label: 'Trapezoid',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="5,4 17,4 20,18 2,18" />
      </svg>
    ),
  },
  {
    type: 'cylinder',
    label: 'Cylinder',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="11" cy="5" rx="8" ry="3" />
        <path d="M 3 5 L 3 17 A 8 3 0 0 0 19 17 L 19 5" />
      </svg>
    ),
  },
  {
    type: 'square',
    label: 'Document',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="14" height="14" rx="2" />
      </svg>
    ),
  },
  {
    type: 'hexagon',
    label: 'Hexagon',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="6,3 16,3 21,11 16,19 6,19 1,11" />
      </svg>
    ),
  },
  {
    type: 'star',
    label: 'Star',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="11,2 13.6,7.9 20,8.7 15.2,13 16.6,19.3 11,16 5.4,19.3 6.8,13 2,8.7 8.4,7.9" />
      </svg>
    ),
  },
];

export function InsertItemPopup({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [iconSearch, setIconSearch] = useState('');
  const [hoveredShape, setHoveredShape] = useState<string | null>(null);

  const activeCategory = useWorkspaceStore((s) => s.insertItemCategory);
  const setActiveCategory = useWorkspaceStore((s) => s.setInsertItemCategory);
  const toggleAiChat = useWorkspaceStore((s) => s.toggleAiChat);
  const toggleDiagramCode = useWorkspaceStore((s) => s.toggleDiagramCode);

  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const setActiveCloudIcon = useWhiteboardStore((s) => s.setActiveCloudIcon);
  const addElement = useWhiteboardStore((s) => s.addElement);
  const setSelectedIds = useWhiteboardStore((s) => s.setSelectedIds);

  const popupRef = useClickOutside<HTMLDivElement>(() => onOpenChange(false), open);
  const { data: filteredIcons = [], isLoading } = useIconSearch(iconSearch, 100);

  if (!open) return null;

  const handleSelectShape = (tool: WhiteboardTool) => {
    setActiveTool(tool);
    onOpenChange(false);
  };

  const handleSelectIconDirect = (kind: string) => {
    setActiveCloudIcon(kind as CloudIconKind);
    setActiveTool('cloud');
    onOpenChange(false);
  };

  const handleAddDeviceFrame = (frameType: 'browser' | 'phone') => {
    const id = `el-frame-${Date.now()}`;
    addElement({
      id,
      type: 'frame',
      x: 150,
      y: 150,
      width: frameType === 'browser' ? 500 : 280,
      height: frameType === 'browser' ? 320 : 520,
      title: frameType === 'browser' ? 'Browser Frame (localhost:3000)' : 'Mobile Phone Frame',
      strokeColor: 'var(--canvas-accent)',
      strokeWidth: 2,
    });
    setSelectedIds([id]);
    setActiveTool('select');
    onOpenChange(false);
  };

  return (
    <div
      ref={popupRef}
      className={cn(
        'absolute top-12 left-16 z-50 flex flex-col rounded-2xl border bg-background/95 p-3.5 shadow-2xl backdrop-blur select-none animate-in fade-in zoom-in-95',
        activeCategory === 'shapes' ? 'w-[360px]' : 'w-80'
      )}
    >
      {/* Top Search Bar */}
      <div className="relative mb-3 flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Insert item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8.5 w-full rounded-lg border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>

      {activeCategory === 'main' && (
        <>
          <div className="mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            All Categories
          </div>

          <div className="flex flex-col gap-1">
            {/* ✨ AI Chat */}
            <button
              onClick={() => {
                toggleAiChat();
                onOpenChange(false);
              }}
              className="flex items-center justify-between rounded-lg border p-2 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">AI Chat</div>
                  <div className="text-[10px] text-muted-foreground">Open AI Chat sidebar</div>
                </div>
              </div>
            </button>

            {/* 📊 Diagram as Code */}
            <button
              onClick={() => {
                toggleDiagramCode();
                onOpenChange(false);
              }}
              className="flex items-center justify-between rounded-lg border p-2 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-500/10 text-purple-600">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Diagram as Code</div>
                  <div className="text-[10px] text-muted-foreground">Create diagram using code</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* 🔷 Shape */}
            <button
              onClick={() => setActiveCategory('shapes')}
              className="flex items-center justify-between rounded-lg border p-2 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                  <Shapes className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Shape</div>
                  <div className="text-[10px] text-muted-foreground">Explore our various shapes</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* 😊 Icon */}
            <button
              onClick={() => setActiveCategory('icons')}
              className="flex items-center justify-between rounded-lg border p-2 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600">
                  <Smile className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Icon</div>
                  <div className="text-[10px] text-muted-foreground">5,000+ Dynamic Icons</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {/* 📱 Device Frame */}
            <button
              onClick={() => setActiveCategory('frames')}
              className="flex items-center justify-between rounded-lg border p-2 text-left transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/10 text-rose-600">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">Device Frame</div>
                  <div className="text-[10px] text-muted-foreground">Phone, tablet, browser frames</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Bottom Grid Actions */}
          <div className="mt-2 grid grid-cols-2 gap-1.5 pt-2 border-t">
            <button
              onClick={() => handleSelectShape('frame')}
              className="flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-colors hover:bg-accent"
            >
              <Shapes className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-[10px] font-medium text-foreground">Figure</span>
            </button>
            <button
              onClick={() => handleSelectShape('sticky')}
              className="flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-colors hover:bg-accent"
            >
              <ImageIcon className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-[10px] font-medium text-foreground">Sticky Note</span>
            </button>
          </div>
        </>
      )}

      {/* 5-COLUMN SHAPE GRID VIEW (matching user screenshot) */}
      {activeCategory === 'shapes' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[11px] font-semibold text-muted-foreground">
              All Categories / <span className="text-foreground font-bold">Shape</span>
            </span>
            <button
              onClick={() => setActiveCategory('main')}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              ← Back
            </button>
          </div>

          {/* 5-Column Grid of Shape Cards */}
          <div className="grid grid-cols-5 gap-2 py-1">
            {POPUP_SHAPE_GRID.map((shape) => {
              const isSelected = activeTool === shape.type || hoveredShape === shape.type;
              return (
                <button
                  key={shape.type}
                  onMouseEnter={() => setHoveredShape(shape.type)}
                  onClick={() => handleSelectShape(shape.type)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-xl border p-2 transition-all cursor-pointer aspect-square',
                    isSelected
                      ? 'border-primary/60 bg-primary/10 text-primary shadow-sm ring-1 ring-primary/30'
                      : 'border-border/60 bg-muted/20 text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
                  )}
                  title={shape.label}
                >
                  <div className="flex h-6 w-6 items-center justify-center">
                    {shape.icon}
                  </div>
                  <span className="text-[9px] font-medium truncate w-full text-center">
                    {shape.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Status Bar */}
          <div className="flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground capitalize">
              {POPUP_SHAPE_GRID.find((s) => s.type === (hoveredShape || activeTool))?.label || 'Rectangle'}
            </span>
            <div className="flex items-center gap-2 font-mono text-[9px] opacity-75">
              <span>↑ ↓ to navigate</span>
              <span>enter to insert</span>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'icons' && (
        <div className="flex flex-col gap-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Icons</span>
            <button
              onClick={() => setActiveCategory('main')}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              ← Back
            </button>
          </div>

          <div className="relative mb-2 flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search 5,000+ icons (e.g. home, server)..."
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              className="h-8 w-full rounded-lg border bg-muted/30 pl-8 pr-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="max-h-56 overflow-auto">
            {isLoading ? (
              <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-primary" />
                Querying icons...
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {filteredIcons.map((i) => {
                  const IconComp = i.icon;
                  if (
                    typeof IconComp !== 'function' &&
                    (typeof IconComp !== 'object' || !IconComp || !(IconComp as any).render)
                  ) {
                    return null;
                  }
                  return (
                    <button
                      key={i.kind}
                      onClick={() => handleSelectIconDirect(i.kind)}
                      className="flex flex-col items-center justify-center rounded-lg border bg-background p-2 text-center transition-all hover:bg-primary/10 hover:border-primary group"
                      title={`${i.name} (${i.source})`}
                    >
                      <IconComp className="h-4 w-4 text-foreground/80 mb-1 group-hover:text-primary transition-colors" />
                      <span className="truncate w-full text-[9px] font-medium text-muted-foreground group-hover:text-foreground">
                        {i.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeCategory === 'frames' && (
        <div className="flex flex-col gap-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Device Frames</span>
            <button
              onClick={() => setActiveCategory('main')}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              ← Back
            </button>
          </div>
          <button
            onClick={() => handleAddDeviceFrame('browser')}
            className="flex items-center gap-2 rounded-lg border p-2 text-xs font-medium hover:bg-accent"
          >
            <Smartphone className="h-4 w-4 text-blue-500" />
            Browser Window Frame
          </button>
          <button
            onClick={() => handleAddDeviceFrame('phone')}
            className="flex items-center gap-2 rounded-lg border p-2 text-xs font-medium hover:bg-accent"
          >
            <Smartphone className="h-4 w-4 text-emerald-500" />
            Mobile Phone Frame
          </button>
        </div>
      )}
    </div>
  );
}
