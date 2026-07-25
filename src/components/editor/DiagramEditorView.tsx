'use client';

import React, { useState } from 'react';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { CodeEditor } from './CodeEditor';
import { FlowchartCanvas } from './FlowchartCanvas';
import { SequenceDiagramCanvas } from './SequenceDiagramCanvas';
import { usePipelineWorker } from '@/lib/hooks/usePipelineWorker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutList,
  GitBranch,
  FileJson,
  Plus,
} from 'lucide-react';

export function DiagramEditorView() {
  usePipelineWorker();

  const status = useDiagramStore((s) => s.status);
  const diagramKind = useDiagramStore((s) => s.diagramKind);
  const errors = useDiagramStore((s) => s.errors);
  const activeDiagramId = useDiagramRegistry((s) => s.activeDiagramId);
  const setSource = useDiagramStore((s) => s.setSource);
  const source = useDiagramStore((s) => s.source);
  const diagrams = useDiagramRegistry((s) => s.diagrams);
  const order = useDiagramRegistry((s) => s.order);
  const setActiveDiagram = useDiagramRegistry((s) => s.setActiveDiagram);
  const createDiagram = useDiagramRegistry((s) => s.createDiagram);

  const [codePanelOpen, setCodePanelOpen] = useState(true);

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Left: Code Editor Panel */}
      {codePanelOpen && (
        <div className="flex w-1/2 min-w-[320px] flex-col border-r bg-background">
          {/* Diagram selector header */}
          <div className="flex h-9 items-center justify-between border-b px-3">
            <div className="flex items-center gap-2">
              <FileJson className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-foreground">Diagram Code (DSL)</span>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={activeDiagramId ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  setActiveDiagram(id);
                  const diagram = diagrams[id];
                  if (diagram) {
                    setSource(diagram.source);
                  }
                }}
                className="h-6 max-w-[140px] rounded border bg-muted/30 px-1.5 text-[10px] font-medium text-foreground outline-none"
              >
                {order.map((id) => (
                  <option key={id} value={id}>
                    {diagrams[id]?.name ?? 'Untitled'}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={() => createDiagram('Untitled diagram', source)}
                title="New Diagram"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* CodeMirror Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeEditor />
          </div>

          {/* Error/Status bar */}
          <div className="flex h-7 items-center gap-2 border-t px-3">
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                status === 'ok' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/30'
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {status === 'ok'
                ? 'Diagram parsed successfully'
                : status === 'error'
                  ? `${errors.length} error${errors.length !== 1 ? 's' : ''} found`
                  : status === 'pending'
                    ? 'Processing...'
                    : 'Ready'}
            </span>
            {errors.length > 0 && status === 'ok' && (
              <span className="text-[10px] text-amber-600">
                ({errors.length} warning{errors.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Right: Diagram Preview */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-muted/10">
        {/* Toggle code panel button + diagram kind badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5 bg-background/80 backdrop-blur"
            onClick={() => setCodePanelOpen(!codePanelOpen)}
            title={codePanelOpen ? 'Hide code panel' : 'Show code panel'}
          >
            {codePanelOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{codePanelOpen ? 'Hide Code' : 'Show Code'}</span>
          </Button>

          {diagramKind && (
            <div className="flex items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
              {diagramKind === 'flowchart' ? (
                <GitBranch className="h-3 w-3" />
              ) : (
                <LayoutList className="h-3 w-3" />
              )}
              <span>{diagramKind === 'flowchart' ? 'Flowchart' : 'Sequence Diagram'}</span>
            </div>
          )}
        </div>

        {/* Diagram Canvas */}
        <div className="flex-1">
          {diagramKind === 'flowchart' ? <FlowchartCanvas /> : <SequenceDiagramCanvas />}
        </div>
      </div>
    </div>
  );
}
