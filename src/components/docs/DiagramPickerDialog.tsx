'use client';

import { useDiagramLibraryStore } from '@/lib/store/diagram-library-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DiagramPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
}

export function DiagramPickerDialog({ open, onOpenChange, onSelect }: DiagramPickerDialogProps) {
  const diagrams = useDiagramLibraryStore((s) => s.diagrams);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a diagram</DialogTitle>
        </DialogHeader>
        {diagrams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved diagrams yet — go to the diagram editor and save one first.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {diagrams.map((d) => (
              <Button key={d.id} variant="ghost" className="justify-start" onClick={() => onSelect(d.id)}>
                {d.name}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}