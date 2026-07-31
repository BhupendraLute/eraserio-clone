'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore, type WorkspaceTab } from '@/lib/store/workspace-store';
import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutGrid,
  Code2,
  FileText,
  Plus,
  Folder,
  Settings,
} from 'lucide-react';

const NAV_ITEMS: { tab: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { tab: 'whiteboard', label: 'Whiteboard', icon: LayoutGrid },
  { tab: 'code', label: 'Diagram-as-Code', icon: Code2 },
  { tab: 'docs', label: 'Markdown Docs', icon: FileText },
];

export function AppNav() {
  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const setActiveTab = useWorkspaceStore((s) => s.setActiveTab);
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r bg-background select-none transition-all duration-300 z-40',
        collapsed ? 'w-12' : 'w-56'
      )}
    >
      {/* Top Header: Brand & Collapse Toggle */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-2.5">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white shadow-sm">
            E
          </div>
          {!collapsed && (
            <span className="truncate text-xs font-bold tracking-tight text-foreground">
              Eraser Clone
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main Navigation List */}
      <div className="flex flex-1 flex-col gap-1 p-1.5 overflow-hidden">
        {!collapsed && (
          <div className="mb-1 px-2 pt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Navigation
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={cn(
                'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-secondary text-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        <div className="my-2 h-px w-full bg-border" />

        {/* Quick Actions */}
        {!collapsed && (
          <div className="mb-1 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Workspace
          </div>
        )}

        <button
          className={cn(
            'flex h-8 items-center gap-2.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
          title="New File"
        >
          <Plus className="h-4 w-4 shrink-0 text-blue-500" />
          {!collapsed && <span className="truncate">New File</span>}
        </button>

        <button
          className={cn(
            'flex h-8 items-center gap-2.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
          title="Documents Folder"
        >
          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
          {!collapsed && <span className="truncate">Documents</span>}
        </button>
      </div>

      {/* Footer / Settings */}
      <div className="border-t p-1.5">
        <button
          className={cn(
            'flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            collapsed && 'justify-center'
          )}
          title="Settings"
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Settings</span>}
        </button>
      </div>
    </aside>
  );
}