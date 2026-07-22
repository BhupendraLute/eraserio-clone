'use client';

import { CodeEditor } from '@/components/editor/CodeEditor';
import { DiagramCanvas } from '@/components/editor/DiagramCanvas';
import { usePipelineWorker } from '@/lib/hooks/usePipelineWorker';
import { useDiagramStore } from '@/lib/store/diagram-store';

export default function EditorPage() {
  usePipelineWorker();

  const status = useDiagramStore((s) => s.status);
  const errors = useDiagramStore((s) => s.errors);

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <span className="text-sm font-medium">Diagram editor</span>
        <span className="text-xs text-muted-foreground">
          {status === 'pending' && 'Parsing…'}
          {status === 'ok' && 'Up to date'}
          {status === 'error' && `${errors.length} error${errors.length === 1 ? '' : 's'}`}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r">
          <CodeEditor />
        </div>
        <div className="w-1/2">
          <DiagramCanvas />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="max-h-32 shrink-0 overflow-auto border-t bg-destructive/5 p-2 text-xs text-destructive">
          {errors.map((e, i) => (
            <div key={i}>
              {e.stage}: {e.message}
              {e.line ? ` (line ${e.line})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}