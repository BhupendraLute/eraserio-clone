'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Sparkles,
  MousePointer,
  Square,
  Circle,
  MoveRight,
  Minus,
  Pencil,
  Type,
  StickyNote,
  Frame,
  Smile,
  MessageSquare,
} from 'lucide-react';
import type { WhiteboardTool } from '@/lib/whiteboard/whiteboard-types';
import { InsertItemPopup } from './InsertItemPopup';
import { CloudIconPicker } from '../whiteboard/CloudIconPicker';

export function CanvasVerticalToolbar() {
  const insertItemOpen = useWorkspaceStore((s) => s.insertItemOpen);
  const setInsertItemOpen = useWorkspaceStore((s) => s.setInsertItemOpen);
  const toggleInsertItem = useWorkspaceStore((s) => s.toggleInsertItem);
  const toggleAiChat = useWorkspaceStore((s) => s.toggleAiChat);

  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const setActiveCloudIcon = useWhiteboardStore((s) => s.setActiveCloudIcon);

  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const tools: { tool: WhiteboardTool; label: string; shortcut: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tool: 'select', label: 'Select (V)', shortcut: 'V', icon: MousePointer },
    { tool: 'rectangle', label: 'Rectangle (R)', shortcut: 'R', icon: Square },
    { tool: 'circle', label: 'Circle (O)', shortcut: 'O', icon: Circle },
    { tool: 'arrow', label: 'Arrow (A)', shortcut: 'A', icon: MoveRight },
    { tool: 'line', label: 'Line (L)', shortcut: 'L', icon: Minus },
    { tool: 'pencil', label: 'Pencil (P)', shortcut: 'P', icon: Pencil },
    { tool: 'text', label: 'Text (T)', shortcut: 'T', icon: Type },
    { tool: 'sticky', label: 'Sticky Note (N)', shortcut: 'N', icon: StickyNote },
    { tool: 'frame', label: 'Frame (F)', shortcut: 'F', icon: Frame },
  ];

  return (
    <div className="absolute top-4 left-3 z-40 flex flex-col items-center gap-1 rounded-xl border bg-background/95 p-1 shadow-xl backdrop-blur select-none">
      {/* Top Insert Item (+ / Ctrl+/) */}
      <Button
        variant={insertItemOpen ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8 text-primary"
        onClick={toggleInsertItem}
        title="Insert item (Ctrl+/)"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* AI Chat Shortcut */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
        onClick={toggleAiChat}
        title="AI Chat (Ctrl+J)"
      >
        <Sparkles className="h-4 w-4" />
      </Button>

      <div className="h-4 w-full px-1">
        <div className="h-px w-full bg-border" />
      </div>

      {/* Primary Tools */}
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <Button
            key={t.tool}
            variant={activeTool === t.tool ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setActiveTool(t.tool)}
            title={t.label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}

      {/* Dedicated Icon Catalog Button (250+ Icons) */}
      <Button
        variant={activeTool === 'cloud' || iconPickerOpen ? 'secondary' : 'ghost'}
        size="icon"
        className="h-8 w-8 text-amber-600"
        onClick={() => setIconPickerOpen(true)}
        title="Icons (React-Icons & Lucide 250+)"
      >
        <Smile className="h-4 w-4" />
      </Button>

      <div className="h-4 w-full px-1">
        <div className="h-px w-full bg-border" />
      </div>

      {/* Comment Tool */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        title="Comment (C)"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {/* Floating Insert Item Catalog Modal */}
      <InsertItemPopup open={insertItemOpen} onOpenChange={setInsertItemOpen} />

      {/* Floating Icon Catalog Picker Modal */}
      <CloudIconPicker
        open={iconPickerOpen}
        onOpenChange={setIconPickerOpen}
        onSelect={(kind) => {
          setActiveCloudIcon(kind);
          setActiveTool('cloud');
        }}
      />
    </div>
  );
}
