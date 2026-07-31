'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import {
  Copy,
  Clipboard,
  Trash2,
  CopyPlus,
  Group,
  Ungroup,
  ArrowUpToLine,
  ArrowDownToLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  CheckSquare,
  Link,
  Scissors,
} from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  context: 'canvas' | 'element' | 'multi';
}

export function ContextMenu({ x, y, onClose, context }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const clipboard = useWhiteboardStore((s) => s.clipboard);
  const canUndo = useWhiteboardStore((s) => s.canUndo);
  const canRedo = useWhiteboardStore((s) => s.canRedo);

  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const copyToClipboard = useWhiteboardStore((s) => s.copyToClipboard);
  const pasteFromClipboard = useWhiteboardStore((s) => s.pasteFromClipboard);
  const groupSelected = useWhiteboardStore((s) => s.groupSelected);
  const ungroupSelected = useWhiteboardStore((s) => s.ungroupSelected);
  const bringToFront = useWhiteboardStore((s) => s.bringToFront);
  const sendToBack = useWhiteboardStore((s) => s.sendToBack);
  const alignLeft = useWhiteboardStore((s) => s.alignLeft);
  const alignCenter = useWhiteboardStore((s) => s.alignCenter);
  const alignRight = useWhiteboardStore((s) => s.alignRight);
  const alignTop = useWhiteboardStore((s) => s.alignTop);
  const alignMiddle = useWhiteboardStore((s) => s.alignMiddle);
  const alignBottom = useWhiteboardStore((s) => s.alignBottom);
  const setSelectedIds = useWhiteboardStore((s) => s.setSelectedIds);
  const undo = useWhiteboardStore((s) => s.undo);
  const redo = useWhiteboardStore((s) => s.redo);

  const hasSelection = selectedIds.length > 0;
  const hasMulti = selectedIds.length > 1;
  const hasClipboard = clipboard.length > 0;
  const hasGroups = elements.some((el) => el.groupId && selectedIds.includes(el.id));

  useOnClickOutside(ref, onClose);

  // Close on Escape key
  useEffect(() => {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  // Clamp position to viewport
  const clampedX = Math.min(x, window.innerWidth - 220);
  const clampedY = Math.min(y, window.innerHeight - 380);

  const menuItemClass =
    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors cursor-default';

  return (
    <div
      ref={ref}
      className="fixed z-[100] w-52 rounded-xl border bg-background/95 py-1.5 shadow-2xl backdrop-blur-lg select-none animate-in fade-in zoom-in-95"
      style={{ left: clampedX, top: clampedY }}
    >
      {/* Undo / Redo */}
      <button className={menuItemClass} onClick={() => { undo(); onClose(); }} disabled={!canUndo}>
        <UndoIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Undo</span>
        <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Z</span>
      </button>
      <button className={menuItemClass} onClick={() => { redo(); onClose(); }} disabled={!canRedo}>
        <RedoIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Redo</span>
        <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Y</span>
      </button>

      {hasSelection && (
        <>
          <div className="mx-2 my-1 h-px bg-border/50" />

          {/* Cut / Copy / Paste / Duplicate */}
          <button className={menuItemClass} onClick={() => { copyToClipboard(); deleteElements(selectedIds); onClose(); }}>
            <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Cut</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+X</span>
          </button>
          <button className={menuItemClass} onClick={() => { copyToClipboard(); onClose(); }}>
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Copy</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+C</span>
          </button>
          <button className={menuItemClass} disabled={!hasClipboard} onClick={() => { pasteFromClipboard(); onClose(); }}>
            <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Paste</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+V</span>
          </button>
          <button className={menuItemClass} onClick={() => { duplicateSelected(); onClose(); }}>
            <CopyPlus className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Duplicate</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+D</span>
          </button>

          <div className="mx-2 my-1 h-px bg-border/50" />

          {/* Group / Ungroup */}
          {hasMulti && (
            <button className={menuItemClass} onClick={() => { groupSelected(); onClose(); }}>
              <Group className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Group</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+G</span>
            </button>
          )}
          {hasGroups && (
            <button className={menuItemClass} onClick={() => { ungroupSelected(); onClose(); }}>
              <Ungroup className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Ungroup</span>
              <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Shift+G</span>
            </button>
          )}

          {/* Align (multi only) */}
          {hasMulti && (
            <>
              <div className="mx-2 my-1 h-px bg-border/50" />
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Align
              </div>
              <div className="grid grid-cols-3 gap-0.5 px-1.5">
                <button className="flex items-center justify-center rounded-md p-1.5 hover:bg-accent transition-colors" onClick={() => { alignLeft(); onClose(); }} title="Align Left">
                  <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button className="flex items-center justify-center rounded-md p-1.5 hover:bg-accent transition-colors" onClick={() => { alignCenter(); onClose(); }} title="Align Center">
                  <AlignCenter className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button className="flex items-center justify-center rounded-md p-1.5 hover:bg-accent transition-colors" onClick={() => { alignRight(); onClose(); }} title="Align Right">
                  <AlignRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button className="flex items-center justify-center rounded-md p-1.5 hover:bg-accent transition-colors" onClick={() => { alignTop(); onClose(); }} title="Align Top">
                  <AlignStartVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button className="flex items-center justify-center rounded-md p-1.5 hover:bg-accent transition-colors" onClick={() => { alignMiddle(); onClose(); }} title="Align Middle">
                  <AlignCenterVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button className="flex items-center justify-center rounded-md p-1.5 hover:bg-accent transition-colors" onClick={() => { alignBottom(); onClose(); }} title="Align Bottom">
                  <AlignEndVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </>
          )}

          {/* Order */}
          <div className="mx-2 my-1 h-px bg-border/50" />
          <button className={menuItemClass} onClick={() => { bringToFront(); onClose(); }}>
            <ArrowUpToLine className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Bring to Front</span>
          </button>
          <button className={menuItemClass} onClick={() => { sendToBack(); onClose(); }}>
            <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Send to Back</span>
          </button>

          {/* Delete */}
          <div className="mx-2 my-1 h-px bg-border/50" />
          <button
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-default"
            onClick={() => { deleteElements(selectedIds); onClose(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Del / ⌫</span>
          </button>
        </>
      )}

      {!hasSelection && (
        <>
          <div className="mx-2 my-1 h-px bg-border/50" />
          <button className={menuItemClass} disabled={!hasClipboard} onClick={() => { pasteFromClipboard(); onClose(); }}>
            <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Paste</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+V</span>
          </button>
          <button className={menuItemClass} onClick={() => { setSelectedIds(elements.map((el) => el.id)); onClose(); }}>
            <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Select All</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+A</span>
          </button>
        </>
      )}
    </div>
  );
}

// Inline icon components to avoid importing unused icons
function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
    </svg>
  );
}
