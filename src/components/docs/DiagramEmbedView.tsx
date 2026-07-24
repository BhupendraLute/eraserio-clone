'use client';

import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useDiagramLibraryStore } from '@/lib/store/diagram-library-store';
import { DiagramPreview } from './DiagramPreview';
import { Button } from '@/components/ui/button';
import { DiagramPickerDialog } from './DiagramPickerDialog';
import { useState } from 'react';
import { Pencil } from 'lucide-react';

export function DiagramEmbedView({ node, updateAttributes }: NodeViewProps) {
  const diagramId = node.attrs.diagramId as string | null;
  const diagram = useDiagramLibraryStore((s) => (diagramId ? s.getDiagram(diagramId) : undefined));
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <NodeViewWrapper className="my-2 rounded-md border p-3">
      {diagram ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{diagram.name}</span>
            <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
              <Pencil className="mr-1 h-3 w-3" />
              Change
            </Button>
          </div>
          <DiagramPreview source={diagram.source} />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">No diagram selected</span>
          <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
            Choose diagram
          </Button>
        </div>
      )}

      <DiagramPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(id) => {
          updateAttributes({ diagramId: id });
          setPickerOpen(false);
        }}
      />
    </NodeViewWrapper>
  );
}