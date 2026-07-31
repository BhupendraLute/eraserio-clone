import { create } from "zustand";
import type { EditorView } from "@codemirror/view";
import type { LaidOutNode, LaidOutEdge } from "@/lib/layout/types";
import type { LaidOutActor, LaidOutMessage } from "@/lib/layout/sequence-types";
import type {
   PipelineError,
   PipelineDiagramResult,
} from "@/workers/pipeline.worker";

interface NodeOverride {
   x: number;
   y: number;
}

interface DiagramState {
   source: string;
   currentDiagramId: string | null;
   diagramKind: "flowchart" | "sequence" | null;

   nodes: LaidOutNode[];
   rawNodes: LaidOutNode[];
   edges: LaidOutEdge[];
   nodeOverrides: Record<string, NodeOverride>;

   sequenceActors: LaidOutActor[];
   sequenceMessages: LaidOutMessage[];
   sequenceWidth: number;
   sequenceHeight: number;

   errors: PipelineError[];
   status: "idle" | "pending" | "ok" | "error";
   editorView: EditorView | null;

   svgElement: SVGSVGElement | null;
   setSvgElement: (el: SVGSVGElement | null) => void;

     setSource: (source: string) => void;
  loadDiagram: (id: string, source: string) => void;
   applyResult: (
      result: PipelineDiagramResult,
      diagnostics: PipelineError[],
   ) => void;
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
   currentDiagramId: null,
   diagramKind: null,

   nodes: [],
   rawNodes: [],
   edges: [],
   nodeOverrides: {},

   sequenceActors: [],
   sequenceMessages: [],
   sequenceWidth: 0,
   sequenceHeight: 0,

   errors: [],
   status: "idle",
   editorView: null,
   svgElement: null,

   setSource: (source) => set({ source }),

  // Switches the editor to a different diagram from the registry —
  // resets everything that's specific to the previously-open diagram
  // (manual node positions, errors) so state doesn't bleed across
  // unrelated diagrams.
  loadDiagram: (id, source) =>
    set({
      currentDiagramId: id,
      source,
      nodeOverrides: {},
      nodes: [],
      rawNodes: [],
      edges: [],
      sequenceActors: [],
      sequenceMessages: [],
      errors: [],
      status: 'idle',
    }),

   applyResult: (result, diagnostics) =>
      set((state) => {
         if (result.kind === "flowchart") {
            return {
               diagramKind: "flowchart",
               rawNodes: result.nodes,
               nodes: result.nodes.map((n) => {
                  const override = state.nodeOverrides[n.id];
                  return override ? { ...n, x: override.x, y: override.y } : n;
               }),
               edges: result.edges,
               errors: diagnostics, // warnings only — status stays 'ok'
               status: "ok",
            };
         }
         return {
            diagramKind: "sequence",
            sequenceActors: result.actors,
            sequenceMessages: result.messages,
            sequenceWidth: result.width,
            sequenceHeight: result.height,
            errors: diagnostics,
            status: "ok",
         };
      }),

   setErrors: (errors) => set({ errors, status: "error" }),
   setPending: () => set({ status: "pending" }),
   setEditorView: (editorView) => set({ editorView }),
   setSvgElement: (svgElement) => set({ svgElement }),

   setNodePosition: (id, x, y) =>
      set((state) => ({
         nodeOverrides: { ...state.nodeOverrides, [id]: { x, y } },
         nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
      })),

   resetNodePosition: (id) =>
      set((state) => {
         const { [id]: _, ...rest } = state.nodeOverrides;
         const rawNode = state.rawNodes.find((n) => n.id === id);
         return {
            nodeOverrides: rest,
            nodes: state.nodes.map((n) =>
               n.id === id && rawNode
                  ? { ...n, x: rawNode.x, y: rawNode.y }
                  : n,
            ),
         };
      }),
}));
