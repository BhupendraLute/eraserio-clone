'use client';

import React, { useState } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import {
  Hash,
  Cloud,
  Eraser,
  GitBranch,
  Trash2,
  Undo2,
  Redo2,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WhiteboardTool, WhiteboardColor } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { SHARED_TOOLS } from '@/lib/whiteboard/tool-definitions';
import { CloudIconPicker } from './CloudIconPicker';

export function WhiteboardToolbar() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const activeColor = useWhiteboardStore((s) => s.activeColor);
  const setActiveColor = useWhiteboardStore((s) => s.setActiveColor);
  const activeStrokeWidth = useWhiteboardStore((s) => s.activeStrokeWidth);
  const setActiveStrokeWidth = useWhiteboardStore((s) => s.setActiveStrokeWidth);
  const setActiveCloudIcon = useWhiteboardStore((s) => s.setActiveCloudIcon);

  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const bringToFront = useWhiteboardStore((s) => s.bringToFront);
  const sendToBack = useWhiteboardStore((s) => s.sendToBack);

  const alignLeft = useWhiteboardStore((s) => s.alignLeft);
  const alignCenter = useWhiteboardStore((s) => s.alignCenter);
  const alignRight = useWhiteboardStore((s) => s.alignRight);

  const undo = useWhiteboardStore((s) => s.undo);
  const redo = useWhiteboardStore((s) => s.redo);
  const canUndo = useWhiteboardStore((s) => s.canUndo);
  const canRedo = useWhiteboardStore((s) => s.canRedo);

  const [cloudPickerOpen, setCloudPickerOpen] = useState(false);

  const uniqueTools: { tool: WhiteboardTool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tool: 'badge', label: 'Step Badge (1,2,3)', icon: Hash },
    { tool: 'eraser', label: 'Eraser Tool', icon: Eraser },
    { tool: 'diagram', label: 'Diagram Embed', icon: GitBranch },
  ];

  const colors: WhiteboardColor[] = ['blue', 'green', 'amber', 'purple', 'rose', 'gray'];

  return (
    <>
      <div className="absolute top-3 left-1/2 z-30 flex -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-xl border bg-muted/90 p-1.5 shadow-lg backdrop-blur">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Tools Palette */}
        <div className="flex items-center gap-0.5">
          {SHARED_TOOLS.map((t) => {
            const Icon = t.icon;
            const tooltip = t.shortcut ? `${t.label} (${t.shortcut})` : t.label;
            return (
              <Button
                key={t.tool}
                variant={activeTool === t.tool ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setActiveTool(t.tool)}
                title={tooltip}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}

          {uniqueTools.map((t) => {
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

          {/* Cloud Nodes Picker */}
          <Button
            variant={activeTool === 'cloud' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setActiveTool('cloud');
              setCloudPickerOpen(true);
            }}
            title="Cloud Infrastructure Node"
          >
            <Cloud className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Color Palette */}
        <div className="flex items-center gap-1 px-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              className={cn(
                'h-4 w-4 rounded-full border transition-transform hover:scale-110',
                activeColor === c && 'ring-2 ring-primary ring-offset-1'
              )}
              style={{ backgroundColor: WHITEBOARD_COLORS[c].border }}
              title={c}
            />
          ))}
        </div>

        {/* Stroke Width Toggle */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 4].map((w) => (
            <Button
              key={w}
              variant={activeStrokeWidth === w ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-1.5 text-[10px] font-bold"
              onClick={() => setActiveStrokeWidth(w)}
              title={`Stroke width ${w}px`}
            >
              {w}px
            </Button>
          ))}
        </div>

        {/* Selected Element Actions (Layering, Alignment, Delete) */}
        {selectedIds.length > 0 && (
          <>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={bringToFront}
                title="Bring to Front"
              >
                <ArrowUpToLine className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={sendToBack}
                title="Send to Back"
              >
                <ArrowDownToLine className="h-4 w-4" />
              </Button>

              {selectedIds.length >= 2 && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={alignLeft} title="Align Left">
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={alignCenter} title="Align Center">
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={alignRight} title="Align Right">
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => deleteElements(selectedIds)}
                title="Delete Selected"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <CloudIconPicker
        open={cloudPickerOpen}
        onOpenChange={setCloudPickerOpen}
        onSelect={(kind) => {
          setActiveCloudIcon(kind);
          setActiveTool('cloud');
        }}
      />
    </>
  );
}
