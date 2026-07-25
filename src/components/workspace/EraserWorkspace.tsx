'use client';

import React, { useState, useRef } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspace-store';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { DiagramEmbed } from '@/components/docs/diagram-embed-extension';
import { SlashCommandExtension } from '@/components/docs/slash-command-extension';
import { DocBottomToolbar } from '@/components/docs/DocBottomToolbar';
import { CanvasVerticalToolbar } from '@/components/canvas/CanvasVerticalToolbar';
import { WhiteboardCanvas } from '@/components/whiteboard/WhiteboardCanvas';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { usePipelineWorker } from '@/lib/hooks/usePipelineWorker';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Code2, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EraserWorkspace() {
  usePipelineWorker();

  const viewMode = useWorkspaceStore((s) => s.viewMode);
  const aiChatOpen = useWorkspaceStore((s) => s.aiChatOpen);
  const setAiChatOpen = useWorkspaceStore((s) => s.setAiChatOpen);
  const diagramCodeOpen = useWorkspaceStore((s) => s.diagramCodeOpen);
  const toggleDiagramCode = useWorkspaceStore((s) => s.toggleDiagramCode);

  // Draggable Code Drawer State
  const [drawerPos, setDrawerPos] = useState({ x: 20, y: 12 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: drawerPos.x,
      initY: drawerPos.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setDrawerPos({
      x: Math.max(10, dragStartRef.current.initX - dx),
      y: Math.max(10, dragStartRef.current.initY + dy),
    });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder:
          'Type your notes or document here — style with markdown or shortcuts (Ctrl/)',
      }),
      DiagramEmbed,
      SlashCommandExtension,
    ],
    content: '<h1 class="text-2xl font-bold mb-4">Untitled File</h1><p></p>',
    immediatelyRender: false,
  });

  const handleInsertDiagram = () => {
    editor?.chain().focus().insertContent({ type: 'diagramEmbed', attrs: { diagramId: null } }).run();
  };

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* 1. Left Document Pane */}
      {(viewMode === 'document' || viewMode === 'both') && (
        <div
          className={cn(
            'relative flex flex-col border-r bg-background transition-all duration-200',
            viewMode === 'document' ? 'w-full' : 'w-1/2'
          )}
        >
          <div className="flex-1 overflow-auto px-12 py-10">
            <div className="mx-auto max-w-3xl">
              <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none min-h-[400px]" />
              
              {/* Shortcut Banner matching Eraser.io */}
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-2 border-dashed text-muted-foreground hover:text-foreground"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  <span>Generate document</span>
                  <span className="rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl J</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Floating Bottom Formatting Toolbar */}
          <DocBottomToolbar editor={editor} onInsertDiagram={handleInsertDiagram} />
        </div>
      )}

      {/* 2. Right Canvas / Whiteboard Pane */}
      {(viewMode === 'canvas' || viewMode === 'both') && (
        <div
          className={cn(
            'relative flex flex-1 flex-col overflow-hidden bg-muted/10 transition-all duration-200',
            viewMode === 'canvas' ? 'w-full' : 'w-1/2'
          )}
        >
          <CanvasVerticalToolbar />

          {/* Draggable CodeMirror DSL Code Editor Drawer */}
          {diagramCodeOpen && (
            <div
              className="absolute z-30 flex h-72 w-96 flex-col rounded-xl border bg-background/95 shadow-2xl backdrop-blur overflow-hidden transition-shadow select-none"
              style={{
                top: `${drawerPos.y}px`,
                right: `${drawerPos.x}px`,
              }}
            >
              {/* Draggable Drag Header Handle */}
              <div
                className="flex h-8 shrink-0 items-center justify-between border-b px-3 bg-muted/40 cursor-move select-none"
                onPointerDown={handleHeaderPointerDown}
                onPointerMove={handleHeaderPointerMove}
                onPointerUp={handleHeaderPointerUp}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground pointer-events-none">
                  <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  <Code2 className="h-3.5 w-3.5 text-purple-600" />
                  <span>Diagram Code (DSL)</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 pointer-events-auto"
                  onClick={toggleDiagramCode}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden pointer-events-auto">
                <CodeEditor />
              </div>
            </div>
          )}

          {/* Whiteboard Canvas Component */}
          <div className="relative flex-1 overflow-hidden">
            <WhiteboardCanvas />
          </div>

          {/* Shortcut Banner matching Eraser.io */}
          <div className="absolute bottom-4 right-16 z-20">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-2 border-dashed text-muted-foreground bg-background/80 backdrop-blur"
              onClick={toggleDiagramCode}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span>Diagram Code (DSL)</span>
              <span className="rounded bg-muted px-1 py-0.5 text-[10px]">Ctrl J</span>
            </Button>
          </div>
        </div>
      )}

      {/* 3. Collapsible AI Chat Sidebar */}
      {aiChatOpen && (
        <div className="z-40 flex h-full w-80 flex-col border-l bg-background shadow-xl animate-in slide-in-from-right">
          <div className="flex h-11 items-center justify-between border-b px-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>EraserAI Assistant</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAiChatOpen(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4 text-xs text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">What would you like to build?</p>
            <div className="flex flex-col gap-2">
              <button className="rounded-lg border p-2 text-left hover:bg-accent">
                Generate architecture diagram for a microservice setup
              </button>
              <button className="rounded-lg border p-2 text-left hover:bg-accent">
                Create sequence diagram for user authentication
              </button>
              <button className="rounded-lg border p-2 text-left hover:bg-accent">
                Write technical doc outline for a REST API
              </button>
            </div>
          </div>
          <div className="border-t p-3">
            <input
              type="text"
              placeholder="Ask AI or type a prompt..."
              className="h-8 w-full rounded-lg border bg-muted/30 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}
