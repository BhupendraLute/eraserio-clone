'use client';

import React, { useState } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import { generateId } from '@/lib/utils';
import {
  Link,
  Focus,
  MessageSquare,
  MoreHorizontal,
  Copy,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FrameElement } from '@/lib/whiteboard/whiteboard-types';
import type { LaidOutNode } from '@/lib/layout/types';

interface FigureToolbarProps {
  fitToContent: (nodes: LaidOutNode[]) => void;
}

export function FigureToolbar({ fitToContent }: FigureToolbarProps) {
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const addElement = useWhiteboardStore((s) => s.addElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const bringToFront = useWhiteboardStore((s) => s.bringToFront);
  const sendToBack = useWhiteboardStore((s) => s.sendToBack);

  const [copied, setCopied] = useState(false);

  if (selectedIds.length !== 1) return null;
  const selectedEl = elements.find((el) => el.id === selectedIds[0]);
  if (!selectedEl || selectedEl.type !== 'frame') return null;

  const figure = selectedEl as FrameElement;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateElement(figure.id, { title: e.target.value });
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFocusFigure = () => {
    fitToContent([
      {
        id: figure.id,
        label: figure.title || 'Figure',
        x: figure.x,
        y: figure.y,
        width: figure.width,
        height: figure.height,
        lines: [],
        attrs: {},
      },
    ]);
  };

  const handleAddComment = () => {
    const id = generateId();
    addElement({
      id,
      type: 'comment',
      x: figure.x + figure.width - 40,
      y: figure.y + 10,
      width: 200,
      height: 80,
      text: 'Comment on ' + (figure.title || 'Figure'),
      author: 'You',
      resolved: false,
      color: 'amber',
      strokeColor: '#f59e0b',
      fillColor: '#fef3c7',
      strokeWidth: 1,
    });
  };

  return (
    <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-border/80 bg-background/95 p-1.5 shadow-2xl backdrop-blur select-none animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* 1. Figure Title Editable Input */}
      <input
        type="text"
        value={figure.title ?? 'Figure 1'}
        onChange={handleTitleChange}
        className="h-8 rounded-lg border border-border/60 bg-muted/30 px-2.5 text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary focus:bg-background w-32"
        placeholder="Figure Name"
        title="Rename Figure"
      />

      <div className="h-4 w-px bg-border/60" />

      {/* 2. Copy Link Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyLink}
        className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-foreground hover:bg-muted/60"
        title="Copy Link to Figure"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-green-500" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Link className="h-3.5 w-3.5 opacity-70" />
            <span>Copy Link</span>
          </>
        )}
      </Button>

      <div className="h-4 w-px bg-border/60" />

      {/* 3. Zoom / Focus Figure Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleFocusFigure}
        className="h-8 w-8 text-foreground hover:bg-muted/60"
        title="Zoom to Figure"
      >
        <Focus className="h-4 w-4 opacity-70" />
      </Button>

      {/* 4. Add Comment Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAddComment}
        className="h-8 w-8 text-foreground hover:bg-muted/60"
        title="Add Comment to Figure"
      >
        <MessageSquare className="h-4 w-4 opacity-70" />
      </Button>

      <div className="h-4 w-px bg-border/60" />

      {/* 5. More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground hover:bg-muted/60 transition-colors outline-none cursor-pointer"
          title="More Options"
        >
          <MoreHorizontal className="h-4 w-4 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 bg-background/95 backdrop-blur border-border p-1 z-50 rounded-xl shadow-2xl">
          <DropdownMenuItem
            onClick={duplicateSelected}
            className="flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 cursor-pointer rounded-md hover:bg-accent"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={bringToFront}
            className="flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 cursor-pointer rounded-md hover:bg-accent"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Bring to Front</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={sendToBack}
            className="flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 cursor-pointer rounded-md hover:bg-accent"
          >
            <ArrowDownRight className="h-3.5 w-3.5" />
            <span>Send to Back</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => deleteElements([figure.id])}
            className="flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 cursor-pointer rounded-md text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Figure</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
