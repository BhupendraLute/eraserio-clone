'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sun, Keyboard, MousePointer, Undo2, Search, Grid, Sliders, Download } from 'lucide-react';
import { ThemeToggle } from '@/components/whiteboard/ThemeToggle';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { usePreferencesStore, GridStyle } from '@/lib/store/preferences-store';

interface ShortcutGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcuts: { keys: string; label: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Drawing Tools',
    icon: MousePointer,
    shortcuts: [
      { keys: 'V', label: 'Select Tool' },
      { keys: 'R', label: 'Rectangle' },
      { keys: 'O', label: 'Circle / Ellipse' },
      { keys: 'D', label: 'Diamond' },
      { keys: 'Y', label: 'Cylinder / Database' },
      { keys: 'A', label: 'Arrow Connector' },
      { keys: 'L', label: 'Line' },
      { keys: 'P', label: 'Pencil / Freehand' },
      { keys: 'T', label: 'Text' },
      { keys: 'N', label: 'Sticky Note' },
      { keys: 'F', label: 'Frame' },
      { keys: 'C', label: 'Comment' },
      { keys: 'E', label: 'Eraser' },
      { keys: 'B', label: 'Badge' },
    ],
  },
  {
    title: 'Actions',
    icon: Undo2,
    shortcuts: [
      { keys: 'Ctrl+Z', label: 'Undo' },
      { keys: 'Ctrl+Y', label: 'Redo' },
      { keys: 'Ctrl+D', label: 'Duplicate Selected' },
      { keys: 'Ctrl+C', label: 'Copy Selected' },
      { keys: 'Ctrl+V', label: 'Paste' },
      { keys: 'Ctrl+A', label: 'Select All' },
      { keys: 'Ctrl+G', label: 'Group Selected' },
      { keys: 'Ctrl+Shift+G', label: 'Ungroup Selected' },
      { keys: 'Delete / Backspace', label: 'Delete Selected' },
      { keys: 'Escape', label: 'Deselect / Cancel' },
      { keys: 'Tab', label: 'Spawn Connected Node' },
    ],
  },
  {
    title: 'Navigation & View',
    icon: Search,
    shortcuts: [
      { keys: 'Ctrl+K', label: 'Command Palette' },
      { keys: 'Space + Drag', label: 'Pan Canvas' },
      { keys: 'Arrow Keys', label: 'Nudge Selected Elements' },
      { keys: 'Shift + Arrow', label: 'Nudge by Larger Step' },
      { keys: 'Scroll', label: 'Zoom In / Out' },
    ],
  },
];

export default function SettingsPage() {
  const { gridStyle, exportScale, setGridStyle, setExportScale } = usePreferencesStore();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex items-center gap-3">
          <Link href="/whiteboard">
            <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </span>
          </Link>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm font-bold text-xs">
            A
          </div>
          <span className="text-sm font-semibold text-foreground">Settings</span>
        </div>
        <SettingsNav active="settings" />
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* Theme Section */}
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Theme</h2>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Appearance</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Switch between Light, Dark, and System theme</div>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </section>

          {/* Canvas & Editor Preferences Section */}
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Editor Preferences</h2>
            </div>

            <div className="space-y-4 rounded-xl border bg-card p-5">
              {/* Canvas Background Grid */}
              <div>
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Grid className="h-4 w-4 text-blue-500" />
                  Default Canvas Grid Style
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Choose your default background grid pattern for new whiteboards.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'dots', label: 'Dots Pattern' },
                    { value: 'grid', label: 'Grid Lines' },
                    { value: 'plain', label: 'Plain Solid' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setGridStyle(item.value as GridStyle)}
                      className={`flex items-center justify-center rounded-lg border p-2.5 text-xs font-medium transition-all ${
                        gridStyle === item.value
                          ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                          : 'bg-background text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Download className="h-4 w-4 text-purple-500" />
                  Default Export Quality
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  Set default resolution multiplier when exporting diagrams to PNG/SVG.
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3].map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setExportScale(scale)}
                      className={`flex-1 rounded-lg border p-2 text-xs font-semibold transition-all ${
                        exportScale === scale
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'bg-background text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {scale}x Scale
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts Section */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Keyboard Shortcuts</h2>
            </div>

            <div className="space-y-4">
              {SHORTCUT_GROUPS.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.title} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {group.title}
                      </h3>
                    </div>
                    <div className="divide-y">
                      {group.shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.keys}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <span className="text-sm text-foreground">{shortcut.label}</span>
                          <kbd className="rounded-md border bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm">
                            {shortcut.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
