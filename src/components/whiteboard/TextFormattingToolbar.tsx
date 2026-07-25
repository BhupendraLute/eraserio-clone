'use client';

import React from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import type { StickyElement, TextElement } from '@/lib/whiteboard/whiteboard-types';

export function TextFormattingToolbar() {
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const updateElement = useWhiteboardStore((s) => s.updateElement);

  if (selectedIds.length !== 1) return null;

  const selectedEl = elements.find((el) => el.id === selectedIds[0]);
  if (!selectedEl || (selectedEl.type !== 'text' && selectedEl.type !== 'sticky')) {
    return null;
  }

  const target = selectedEl as TextElement | StickyElement;
  const currentFontSize = target.fontSize ?? (target.type === 'text' ? 16 : 12);
  const currentFontFamily = target.fontFamily ?? 'sans-serif';
  const isBold = target.fontWeight === 'bold';
  const isItalic = target.fontStyle === 'italic';
  const currentAlign = target.textAlign ?? (target.type === 'text' ? 'left' : 'center');

  const fontSizes = [12, 14, 16, 20, 24, 32, 48];
  const fontFamilies = [
    { label: 'Sans-Serif', value: 'ui-sans-serif, system-ui, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, monospace' },
    { label: 'Hand-drawn', value: 'Caveat, cursive, sans-serif' },
  ];

  return (
    <div className="absolute top-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/95 p-1 shadow-md backdrop-blur">
      {/* Font Family Selector */}
      <select
        value={currentFontFamily}
        onChange={(e) => updateElement(target.id, { fontFamily: e.target.value })}
        className="h-7 rounded border bg-background px-2 text-xs text-foreground outline-none"
      >
        {fontFamilies.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      {/* Font Size Selector */}
      <select
        value={currentFontSize}
        onChange={(e) => updateElement(target.id, { fontSize: Number(e.target.value) })}
        className="h-7 rounded border bg-background px-2 text-xs text-foreground outline-none"
      >
        {fontSizes.map((s) => (
          <option key={s} value={s}>
            {s}px
          </option>
        ))}
      </select>

      <div className="h-4 w-px bg-border" />

      {/* Bold Toggle */}
      <Button
        variant={isBold ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => updateElement(target.id, { fontWeight: isBold ? 'normal' : 'bold' })}
        title="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>

      {/* Italic Toggle */}
      <Button
        variant={isItalic ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => updateElement(target.id, { fontStyle: isItalic ? 'normal' : 'italic' })}
        title="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border" />

      {/* Alignment Toggles */}
      <Button
        variant={currentAlign === 'left' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => updateElement(target.id, { textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={currentAlign === 'center' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => updateElement(target.id, { textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={currentAlign === 'right' ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => updateElement(target.id, { textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
