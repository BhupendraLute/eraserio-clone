'use client';

import React from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  MoreHorizontal,
  Copy,
  CopyPlus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  WrapText,
  ChevronDown,
  Check,
  Minus,
  Plus,
} from 'lucide-react';
import type { TextElement } from '@/lib/whiteboard/whiteboard-types';
import { ERASER_CODE_LANGUAGES, computeTextElementSize, STROKE_COLOR_PALETTE } from '@/lib/whiteboard/whiteboard-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TextFormattingToolbar() {
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const setAiChatOpen = useWorkspaceStore((s) => s.setAiChatOpen);

  if (selectedIds.length !== 1) return null;

  const selectedEl = elements.find((el) => el.id === selectedIds[0]);
  if (!selectedEl || selectedEl.type !== 'text') {
    return null;
  }

  const target = selectedEl as TextElement;
  const isCodeMode = target.mode === 'code';
  const currentFontSize = target.fontSize ?? (isCodeMode ? 16 : 34);
  const currentLanguage = target.language ?? 'Auto detect';

  const fontPresets = [
    { label: 'Small', value: 14 },
    { label: 'Medium', value: 16 },
    { label: 'Large', value: 24 },
    { label: 'X-Large', value: 34 },
  ];

  const handleCopyText = () => {
    if (target.text) {
      navigator.clipboard.writeText(target.text);
    }
  };

  const handleModeChange = (newMode: 'text' | 'code') => {
    const newFontSize = newMode === 'code' ? (target.fontSize === 34 ? 16 : target.fontSize) : (target.fontSize === 16 ? 34 : target.fontSize);
    const newSize = computeTextElementSize(target.text, newFontSize, newMode);
    updateElement(target.id, {
      mode: newMode,
      fontSize: newFontSize,
      language: newMode === 'code' ? (target.language || 'Auto detect') : target.language,
      width: newSize.width,
      height: newSize.height,
      isUserResized: false,
    });
  };

  const handleFontSizeChange = (newFontSize: number) => {
    const mode = target.mode || 'text';
    const newSize = computeTextElementSize(target.text, newFontSize, mode);
    updateElement(target.id, {
      fontSize: newFontSize,
      width: newSize.width,
      height: newSize.height,
      isUserResized: false,
    });
  };

  const handleDecreaseFontSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSize = Math.max(10, currentFontSize - 2);
    handleFontSizeChange(nextSize);
  };

  const handleIncreaseFontSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSize = Math.min(96, currentFontSize + 2);
    handleFontSizeChange(nextSize);
  };

  return (
    <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border/80 bg-background/95 p-1.5 shadow-2xl backdrop-blur select-none">
      {/* 1. Segmented Mode Control: [ Text | Code ] */}
      <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/40">
        <button
          onClick={() => handleModeChange('text')}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
            !isCodeMode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Text
        </button>
        <button
          onClick={() => handleModeChange('code')}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
            isCodeMode
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Code
        </button>
      </div>

      <div className="h-4 w-px bg-border/60" />

      {/* 2. Font Size Selector Dropdown with Stepper Header & Presets */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors outline-none cursor-pointer"
          title="Select Font Size"
        >
          <span>{currentFontSize}px</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48 bg-background/95 border-border shadow-2xl backdrop-blur p-2 select-none z-50 rounded-xl">
          {/* Top Stepper Header: [ -   24px   + ] */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-1 mb-1.5">
            <button
              type="button"
              onClick={handleDecreaseFontSize}
              className="flex h-6 w-6 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              title="Decrease Font Size (-2px)"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-bold text-foreground">{currentFontSize}px</span>
            <button
              type="button"
              onClick={handleIncreaseFontSize}
              className="flex h-6 w-6 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              title="Increase Font Size (+2px)"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <DropdownMenuSeparator className="my-1.5" />

          {/* Presets List */}
          <div className="flex flex-col gap-0.5">
            {fontPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.label}
                onClick={() => handleFontSizeChange(preset.value)}
                className={cn(
                  "flex items-center justify-between text-xs font-medium px-2.5 py-1.5 cursor-pointer rounded-md transition-colors",
                  currentFontSize === preset.value
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "hover:bg-muted/60 text-foreground"
                )}
              >
                <span>{preset.label}</span>
                {currentFontSize === preset.value && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 3. Text Color Palette Tool (Text Mode Only) */}
      {!isCodeMode && (
        <>
          <div className="h-4 w-px bg-border/60" />
          <div className="flex items-center gap-1.5 px-1">
            {STROKE_COLOR_PALETTE.map((colorHex) => (
              <button
                key={colorHex}
                type="button"
                className={cn(
                  "h-5 w-5 rounded-full border border-border/40 transition-transform hover:scale-110",
                  (target.strokeColor === colorHex || (target.strokeColor === 'var(--foreground)' && colorHex === '#ffffff')) && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
                style={{ backgroundColor: colorHex }}
                onClick={() => updateElement(target.id, { strokeColor: colorHex })}
                title={`Text Color ${colorHex}`}
              />
            ))}
            <div className="relative flex h-5 w-5 items-center justify-center rounded-full border border-border/40 overflow-hidden cursor-pointer hover:scale-110 transition-transform bg-gradient-to-br from-red-500 via-green-500 to-blue-500" title="Custom text color">
              <input
                type="color"
                value={target.strokeColor && target.strokeColor.startsWith('#') ? target.strokeColor : '#ffffff'}
                onChange={(e) => updateElement(target.id, { strokeColor: e.target.value })}
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </>
      )}

      {/* 4. Code Mode Specific Options: Language Selector & Text Wrap Button */}
      {isCodeMode && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors outline-none cursor-pointer"
              title="Select Code Language"
            >
              <span>{currentLanguage}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto min-w-[140px] bg-background/95 border-border shadow-2xl backdrop-blur p-1 select-none z-50">
              {ERASER_CODE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => updateElement(target.id, { language: lang, mode: 'code' })}
                  className={cn(
                    "flex items-center justify-between text-xs font-medium px-2.5 py-1.5 cursor-pointer rounded-md transition-colors",
                    currentLanguage === lang
                      ? "bg-accent text-accent-foreground font-semibold"
                      : "hover:bg-muted/60 text-foreground"
                  )}
                >
                  <span>{lang}</span>
                  {currentLanguage === lang && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const currentWrap = target.textWrap ?? true;
              updateElement(target.id, { textWrap: !currentWrap });
            }}
            className={cn(
              "h-8 px-2.5 text-xs font-semibold text-foreground/80 hover:bg-muted/60 hover:text-foreground transition-colors border border-border/50 rounded-lg gap-1.5",
              (target.textWrap ?? true) && "bg-muted/80 text-foreground border-border"
            )}
            title="Toggle Line Wrapping"
          >
            <WrapText className="h-3.5 w-3.5" />
            <span>{(target.textWrap ?? true) ? 'Wrap' : 'No Wrap'}</span>
          </Button>
        </>
      )}

      <div className="h-4 w-px bg-border/60" />

      {/* 4. Comment / AI Chat Action */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => setAiChatOpen(true)}
        title="Open AI Chat / Comment"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {/* 5. More Options Dropdown (...) */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground outline-none transition-colors"
          title="More Options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 select-none">
          <DropdownMenuItem onClick={handleCopyText} className="gap-2">
            <Copy className="h-3.5 w-3.5" />
            <span>Copy snippet</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={duplicateSelected} className="gap-2">
            <CopyPlus className="h-3.5 w-3.5" />
            <span>Duplicate</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              updateElement(target.id, {
                fontWeight: target.fontWeight === 'bold' ? 'normal' : 'bold',
              })
            }
            className="gap-2"
          >
            <Bold className="h-3.5 w-3.5" />
            <span>Toggle Bold</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              updateElement(target.id, {
                fontStyle: target.fontStyle === 'italic' ? 'normal' : 'italic',
              })
            }
            className="gap-2"
          >
            <Italic className="h-3.5 w-3.5" />
            <span>Toggle Italic</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => updateElement(target.id, { textAlign: 'left' })}
            className="gap-2"
          >
            <AlignLeft className="h-3.5 w-3.5" />
            <span>Align Left</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateElement(target.id, { textAlign: 'center' })}
            className="gap-2"
          >
            <AlignCenter className="h-3.5 w-3.5" />
            <span>Align Center</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => updateElement(target.id, { textAlign: 'right' })}
            className="gap-2"
          >
            <AlignRight className="h-3.5 w-3.5" />
            <span>Align Right</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => deleteElements([target.id])}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
