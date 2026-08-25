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
import { DiagramEditorView } from '@/components/editor/DiagramEditorView';
import { usePipelineWorker } from '@/lib/hooks/usePipelineWorker';
import { AiChatPanel } from '@/components/ai/AiChatPanel';
import { AiDiagramPreviewModal } from '@/components/ai/AiDiagramPreviewModal';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Code2, GripHorizontal, Layers, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDocumentStore } from '@/lib/store/document-store';
import { convertDslToWhiteboardElements } from '@/lib/whiteboard/convert-dsl-to-whiteboard';
import { toast } from 'sonner';

export function EraserWorkspace() {
  usePipelineWorker();

  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const aiChatOpen = useWorkspaceStore((s) => s.aiChatOpen);
  const diagramCodeOpen = useWorkspaceStore((s) => s.diagramCodeOpen);
  const toggleDiagramCode = useWorkspaceStore((s) => s.toggleDiagramCode);
  const hideUI = useWhiteboardStore((s) => s.hideUI);

  // Draggable & Resizable Code Drawer State (Width & Height)
  const [drawerPos, setDrawerPos] = useState({ x: 20, y: 12 });
  const [drawerSize, setDrawerSize] = useState({ width: 480, height: 320 });

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startY: number; initW: number; initH: number } | null>(null);

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

  const handleHeaderPointerUp = () => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initW: drawerSize.width,
      initH: drawerSize.height,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!isResizingRef.current || !resizeStartRef.current) return;
    const dw = e.clientX - resizeStartRef.current.startX;
    const dh = e.clientY - resizeStartRef.current.startY;
    setDrawerSize({
      width: Math.max(340, Math.min(950, resizeStartRef.current.initW - dw)),
      height: Math.max(180, Math.min(750, resizeStartRef.current.initH + dh)),
    });
  };

  const handleResizePointerUp = () => {
    isResizingRef.current = false;
    resizeStartRef.current = null;
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

  // Render the active tab's content
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'code':
        return <DiagramEditorView />;

      case 'docs':
        return (
          <div className="relative flex flex-1 flex-col bg-background">
            <div className="flex-1 overflow-auto px-12 py-10">
              <div className="mx-auto max-w-3xl">
                <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none min-h-[400px]" />

                {/* Shortcut Banner */}
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
        );

      default: // 'whiteboard'
        return (
          <div
            className={cn(
              'relative flex flex-1 flex-col overflow-hidden bg-muted/10',
            )}
          >
            {!hideUI && <CanvasVerticalToolbar />}

            {/* Draggable & Resizable CodeMirror DSL Code Editor Drawer */}
            {diagramCodeOpen && (
              <div
                className="absolute z-30 flex flex-col rounded-xl border bg-background/95 shadow-2xl backdrop-blur overflow-hidden transition-shadow select-none"
                style={{
                  top: `${drawerPos.y}px`,
                  right: `${drawerPos.x}px`,
                  width: `${drawerSize.width}px`,
                  height: `${drawerSize.height}px`,
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
                  <div className="flex items-center gap-1 pointer-events-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-5 px-1.5 gap-1 text-[10px] font-medium"
                      title="Convert diagram code into native whiteboard shapes"
                      onClick={() => {
                        const dsl = useDiagramStore.getState().source;
                        const elements = convertDslToWhiteboardElements(dsl);
                        if (elements.length > 0) {
                          useWhiteboardStore.getState().addElements(elements);
                          toast.success('Converted diagram to whiteboard shapes!');
                        } else {
                          toast.error('Failed to convert diagram code to shapes');
                        }
                      }}
                    >
                      <Layers className="h-3 w-3 text-blue-500" />
                      <span>To Shapes</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={toggleDiagramCode}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-hidden pointer-events-auto">
                  <CodeEditor />
                </div>

                {/* Bottom-Left Resize Handle (Width + Height Drag Grip) */}
                <div
                  className="group absolute bottom-1 left-1 h-3.5 w-3.5 cursor-nesw-resize z-50 flex items-center justify-center rounded p-0.5 hover:bg-purple-500/30 active:bg-purple-600/50 transition-colors pointer-events-auto"
                  onPointerDown={handleResizePointerDown}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  title="Drag to resize width and height of Diagram Code panel"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500/70 group-hover:bg-purple-500 group-hover:scale-125 transition-all" />
                </div>
              </div>
            )}

            {/* Whiteboard Canvas Component */}
            <div className="relative flex-1 overflow-hidden">
              <WhiteboardCanvas />
            </div>
          </div>
        );
    }
  };

  const isDocumentLoading = useDocumentStore((s) => s.isLoading);
  const activeDocumentTitle = useDocumentStore((s) => s.activeDocumentTitle);

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {isDocumentLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center bg-background/80 backdrop-blur-md p-6 select-none animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20 shadow-inner">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{activeDocumentTitle || 'Loading Workspace...'}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Hydrating canvas elements & diagram pipeline...</p>
            </div>
          </div>
        </div>
      ) : (
        renderActiveTab()
      )}

      {/* Collapsible Architecta AI sidebar (available in all tabs) */}
      {aiChatOpen && <AiChatPanel />}

      {/* Interactive AI Diagram Edit Preview Popup Modal */}
      <AiDiagramPreviewModal />
    </div>
  );
}
