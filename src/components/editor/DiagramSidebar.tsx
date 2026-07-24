'use client';

import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_NEW_SOURCE = `flowchart

A
B

A > B
`;

export function DiagramSidebar() {
  const order = useDiagramRegistry((s) => s.order);
  const diagrams = useDiagramRegistry((s) => s.diagrams);
  const activeDiagramId = useDiagramRegistry((s) => s.activeDiagramId);
  const setActiveDiagram = useDiagramRegistry((s) => s.setActiveDiagram);
  const createDiagram = useDiagramRegistry((s) => s.createDiagram);

  const loadDiagram = useDiagramStore((s) => s.loadDiagram);

  const handleSelect = (id: string) => {
    const record = diagrams[id];
    if (!record) return;
    setActiveDiagram(id);
    loadDiagram(id, record.source);
  };

  const handleCreate = () => {
    const id = createDiagram('Untitled diagram', DEFAULT_NEW_SOURCE);
    loadDiagram(id, DEFAULT_NEW_SOURCE);
  };

  return (
    <div className="flex h-full w-48 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Diagrams</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreate} aria-label="New diagram">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-1">
        {order.map((id) => {
          const record = diagrams[id];
          if (!record) return null;
          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent',
                activeDiagramId === id && 'bg-accent'
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{record.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}