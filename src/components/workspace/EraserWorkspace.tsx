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
import { Sparkles, X, Code2, GripHorizontal, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { convertDslToWhiteboardElements } from '@/lib/whiteboard/convert-dsl-to-whiteboard';
import { toast } from 'sonner';

export function EraserWorkspace() {
  usePipelineWorker();

  const activeTab = useWorkspaceStore((s) => s.activeTab);
  const aiChatOpen = useWorkspaceStore((s) => s.aiChatOpen);
  const diagramCodeOpen = useWorkspaceStore((s) => s.diagramCodeOpen);
  const toggleDiagramCode = useWorkspaceStore((s) => s.toggleDiagramCode);
  const hideUI = useWhiteboardStore((s) => s.hideUI);

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

  const handleHeaderPointerUp = () => {
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

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {renderActiveTab()}

      {/* Collapsible Architecta AI sidebar (available in all tabs) */}
      {aiChatOpen && <AiChatPanel />}

      {/* Interactive AI Diagram Edit Preview Popup Modal */}
      <AiDiagramPreviewModal />
    </div>
  );
}
