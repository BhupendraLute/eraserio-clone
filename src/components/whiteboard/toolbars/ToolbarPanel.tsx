'use client';

import React from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import type { WhiteboardColor } from '@/lib/whiteboard/whiteboard-types';
import {
  CopyPlus,
  Copy,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';

export function ToolbarPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-xl border bg-background/95 p-1.5 shadow-2xl backdrop-blur select-none animate-in fade-in zoom-in-95 ${className}`}
    >
      {children}
    </div>
  );
}

export function ToolbarDivider() {
  return <div className="h-4 w-px bg-border/60 mx-0.5" />;
}

export function ToolbarButton({
  children,
  onClick,
  active = false,
  title,
  className = '',
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-accent text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function ToolbarColorPicker({
  isOpen,
  onToggle,
  currentColor,
  onSelectColor,
}: {
  isOpen: boolean;
  onToggle: () => void;
  currentColor?: string;
  onSelectColor: (colorKey: WhiteboardColor) => void;
}) {
  const preset = WHITEBOARD_COLORS[(currentColor as WhiteboardColor) || 'blue'] || WHITEBOARD_COLORS['blue'];

  return (
    <div className="relative">
      <ToolbarButton onClick={onToggle} active={isOpen} title="Color Palette">
        <span
          className="h-4 w-4 rounded-full border border-border/80 shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: preset.border }}
        />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </ToolbarButton>

      {isOpen && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex w-56 flex-col rounded-xl border bg-background/95 p-3 shadow-2xl backdrop-blur select-none animate-in fade-in zoom-in-95">
          <div className="mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Palette Colors
          </div>
          <div className="grid grid-cols-6 gap-2">
            {(Object.keys(WHITEBOARD_COLORS) as WhiteboardColor[]).map((cKey) => {
              const cPreset = WHITEBOARD_COLORS[cKey];
              const isSelected = currentColor === cKey;
              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => onSelectColor(cKey)}
                  className={`group relative flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all hover:scale-110 ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:border-primary/50'
                  }`}
                  style={{ backgroundColor: cPreset.border, borderColor: cPreset.border }}
                  title={cKey.toUpperCase()}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToolbarMoreMenu({
  isOpen,
  onToggle,
  onDuplicate,
  onCopy,
  onBringToFront,
  onSendToBack,
  onDelete,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="relative">
      <ToolbarButton onClick={onToggle} active={isOpen} title="More Actions">
        <MoreHorizontal className="h-4 w-4" />
      </ToolbarButton>

      {isOpen && (
        <div className="absolute bottom-11 right-0 z-50 flex w-44 flex-col rounded-xl border bg-background/95 p-1 shadow-2xl backdrop-blur select-none animate-in fade-in zoom-in-95">
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent"
            >
              <CopyPlus className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Duplicate</span>
            </button>
          )}
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Copy</span>
            </button>
          )}
          {onBringToFront && (
            <button
              type="button"
              onClick={onBringToFront}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent"
            >
              <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Bring to Front</span>
            </button>
          )}
          {onSendToBack && (
            <button
              type="button"
              onClick={onSendToBack}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-foreground hover:bg-accent"
            >
              <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Send to Back</span>
            </button>
          )}
          <div className="my-1 h-px w-full bg-border/60" />
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
