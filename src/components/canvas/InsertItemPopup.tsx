'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { generateId } from '@/lib/utils';
import {
  Sparkles,
  GitBranch,
  Shapes,
  Smile,
  Smartphone,
  Search,
  Image as ImageIcon,
  ChevronRight,
  Square,
  Circle,
  Diamond,
  Database,
  MoveRight,
  Loader2,
} from 'lucide-react';
import type { WhiteboardTool, CloudIconKind } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { useIconSearch } from '@/lib/hooks/useIconSearch';

export function InsertItemPopup({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const [iconSearch, setIconSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'main' | 'shapes' | 'icons' | 'frames'>('main');
  const popupRef = useClickOutside<HTMLDivElement>(() => onOpenChange(false), open);

  const { data: filteredIcons = [], isLoading } = useIconSearch(iconSearch, 100);

  const toggleAiChat = useWorkspaceStore((s) => s.toggleAiChat);
  const toggleDiagramCode = useWorkspaceStore((s) => s.toggleDiagramCode);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const addElement = useWhiteboardStore((s) => s.addElement);
  const setSelectedIds = useWhiteboardStore((s) => s.setSelectedIds);
  const activeColor = useWhiteboardStore((s) => s.activeColor);

  if (!open) return null;

  const handleSelectShape = (tool: WhiteboardTool) => {
    setActiveTool(tool);
    onOpenChange(false);
  };

  const handleSelectIconDirect = (kind: string) => {
    // DIRECT CANVAS INSERTION
    const colorStyle = WHITEBOARD_COLORS[activeColor];
    const id = generateId();
    
    const posX = 300 + (Math.random() * 40 - 20);
    const posY = 200 + (Math.random() * 40 - 20);

    addElement({
      id,
      type: 'cloud',
      x: posX,
      y: posY,
      width: 64,
      height: 64,
      iconKind: kind as CloudIconKind,
      strokeColor: colorStyle.border,
      fillColor: colorStyle.bg,
      strokeWidth: 2,
    });

    setSelectedIds([id]);
    setActiveTool('select');
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
      className="absolute top-12 left-16 z-50 flex w-80 flex-col rounded-xl border bg-background/95 p-3 shadow-2xl backdrop-blur select-none animate-in fade-in zoom-in-95"
    >
      {/* Search Bar for Main View */}
      {activeCategory === 'main' && (
        <div className="relative mb-3 flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Insert item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-lg border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
      )}

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

      {activeCategory === 'shapes' && (
        <div className="flex flex-col gap-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Shapes</span>
            <button
              onClick={() => setActiveCategory('main')}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              ← Back
            </button>
          </div>
          <button
            onClick={() => handleSelectShape('rectangle')}
            className="flex items-center gap-2 rounded-lg border p-2 text-xs font-medium hover:bg-accent"
          >
            <Square className="h-4 w-4 text-blue-500" />
            Rectangle
          </button>
          <button
            onClick={() => handleSelectShape('circle')}
            className="flex items-center gap-2 rounded-lg border p-2 text-xs font-medium hover:bg-accent"
          >
            <Circle className="h-4 w-4 text-emerald-500" />
            Circle / Ellipse
          </button>
          <button
            onClick={() => handleSelectShape('diamond')}
            className="flex items-center gap-2 rounded-lg border p-2 text-xs font-medium hover:bg-accent"
          >
            <Diamond className="h-4 w-4 text-amber-500" />
            Decision Diamond
          </button>
          <button
            onClick={() => handleSelectShape('cylinder')}
            className="flex items-center gap-2 rounded-lg border p-2 text-xs font-medium hover:bg-accent"
          >
            <Database className="h-4 w-4 text-purple-500" />
            Database Cylinder
          </button>
          <button
            onClick={() => handleSelectShape('arrow')}
            className="flex items-center gap-2 rounded-lg border p-2 text-xs font-medium hover:bg-accent"
          >
            <MoveRight className="h-4 w-4 text-rose-500" />
            Arrow Connector
          </button>
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
