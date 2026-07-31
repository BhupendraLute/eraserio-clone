'use client';

import React, { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Sparkles,
  Smile,
} from 'lucide-react';
import { SHARED_TOOLS } from '@/lib/whiteboard/tool-definitions';
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

  return (
    <div className="absolute top-4 left-3 z-40 flex flex-col items-center gap-1 rounded-xl border bg-muted/90 p-1 shadow-xl backdrop-blur select-none">
      {/* Top Insert Item (+ / Ctrl+/) */}
      <Button variant={insertItemOpen ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 text-primary"
        onClick={toggleInsertItem} title="Insert item (Ctrl+/)">
        <Plus className="h-4 w-4" />
      </Button>

      {/* AI Chat Shortcut */}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
        onClick={toggleAiChat} title="AI Chat (Ctrl+J)">
        <Sparkles className="h-4 w-4" />
      </Button>

      <div className="h-4 w-full px-1">
        <div className="h-px w-full bg-border" />
      </div>

      {/* Primary Tools */}
      {SHARED_TOOLS.map((t) => {
        const Icon = t.icon;
        const tooltip = t.shortcut ? `${t.label} (${t.shortcut})` : t.label;
        return (
          <Button key={t.tool} variant={activeTool === t.tool ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8"
            onClick={() => setActiveTool(t.tool)} title={tooltip}>
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}

      {/* Dedicated Icon Catalog Button */}
      <Button variant={activeTool === 'cloud' || iconPickerOpen ? 'secondary' : 'ghost'} size="icon"
        className="h-8 w-8 text-amber-600" onClick={() => setIconPickerOpen(true)} title="Icons (250+)">
        <Smile className="h-4 w-4" />
      </Button>

      <div className="h-4 w-full px-1">
        <div className="h-px w-full bg-border" />
      </div>

      {/* Floating Insert Item Catalog Modal */}
      <InsertItemPopup open={insertItemOpen} onOpenChange={setInsertItemOpen} />

      {/* Floating Icon Catalog Picker Modal */}
      <CloudIconPicker open={iconPickerOpen} onOpenChange={setIconPickerOpen}
        onSelect={(kind) => { setActiveCloudIcon(kind); setActiveTool('cloud'); }} />
    </div>
  );
}
