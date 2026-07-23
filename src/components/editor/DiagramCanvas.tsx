'use client';

import { useDiagramStore } from '@/lib/store/diagram-store';
import { FlowchartCanvas } from '@/components/editor/FlowchartCanvas';
import { SequenceDiagramCanvas } from '@/components/editor/SequenceDiagramCanvas';

export function DiagramCanvas() {
  const diagramKind = useDiagramStore((s) => s.diagramKind);

  if (diagramKind === 'sequence') {
    return <SequenceDiagramCanvas />;
  }

  return <FlowchartCanvas />;
}