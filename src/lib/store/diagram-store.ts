import { create } from 'zustand';
import type { EditorView } from '@codemirror/view';
import type { LaidOutNode, LaidOutEdge } from '@/lib/layout/types';
import type { PipelineError } from '@/workers/pipeline.worker';

interface NodeOverride {
  x: number;
  y: number;
}

interface DiagramState {
  source: string;
  nodes: LaidOutNode[];      // display nodes — overrides already merged in
  rawNodes: LaidOutNode[];   // last layout straight from the pipeline, pre-override
  edges: LaidOutEdge[];
  errors: PipelineError[];
  status: 'idle' | 'pending' | 'ok' | 'error';
  editorView: EditorView | null;
  nodeOverrides: Record<string, NodeOverride>;
  setSource: (source: string) => void;
  setLayout: (nodes: LaidOutNode[], edges: LaidOutEdge[]) => void;
  setErrors: (errors: PipelineError[]) => void;
  setPending: () => void;
  setEditorView: (view: EditorView | null) => void;
  setNodePosition: (id: string, x: number, y: number) => void;
  resetNodePosition: (id: string) => void;
}

const DEFAULT_SOURCE = `flowchart

Client [icon: user]
API Gateway
Auth Service
Database [icon: database]

Client > API Gateway: request
API Gateway > Auth Service: validate token
Auth Service > Database: check session
`;

export const useDiagramStore = create<DiagramState>((set) => ({
  source: DEFAULT_SOURCE,
  nodes: [],
  rawNodes: [],
  edges: [],
  errors: [],
  status: 'idle',
  editorView: null,
  nodeOverrides: {},

  setSource: (source) => set({ source }),

  // Fresh layout from the worker. Re-apply any manual overrides on top,
  // so editing the DSL doesn't snap manually-positioned nodes back to
  // their auto-layout spot.
  setLayout: (nodes, edges) =>
    set((state) => ({
      rawNodes: nodes,
      nodes: nodes.map((n) => {
        const override = state.nodeOverrides[n.id];
        return override ? { ...n, x: override.x, y: override.y } : n;
      }),
      edges,
      errors: [],
      status: 'ok',
    })),

  setErrors: (errors) => set({ errors, status: 'error' }),
  setPending: () => set({ status: 'pending' }),
  setEditorView: (editorView) => set({ editorView }),

  // Called continuously during a drag — updates both the override map
  // (so it survives the next layout) and the live displayed position.
  setNodePosition: (id, x, y) =>
    set((state) => ({
      nodeOverrides: { ...state.nodeOverrides, [id]: { x, y } },
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),

  // Drops the override and snaps the node back to its last known
  // auto-layout position.
  resetNodePosition: (id) =>
    set((state) => {
      const { [id]: _removed, ...rest } = state.nodeOverrides;
      const rawNode = state.rawNodes.find((n) => n.id === id);
      return {
        nodeOverrides: rest,
        nodes: state.nodes.map((n) =>
          n.id === id && rawNode ? { ...n, x: rawNode.x, y: rawNode.y } : n
        ),
      };
    }),
}));