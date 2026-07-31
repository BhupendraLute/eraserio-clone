# Architecture — Quick Reference

> 📚 **Full docs:** [`Documentation/02-architecture-overview.md`](../Documentation/02-architecture-overview.md) · [`Documentation/03-project-structure.md`](../Documentation/03-project-structure.md)

## Stack at a Glance

| Tech | Role |
|---|---|
| Next.js 16 (App Router) | Routing, SSR, React Compiler |
| React 19 | UI components & hooks |
| TailwindCSS v4 + shadcn/ui | Styling + accessible primitives |
| Chevrotain | DSL tokenizer & parser |
| Dagre | Flowchart auto-layout |
| CodeMirror 6 | DSL editor + syntax highlighting + lint |
| Tiptap (ProseMirror) | Docs editor + diagram embed nodes |
| Zustand v5 | Global state (5 stores) |
| React Query | Icon search query cache |

## Layers

| Layer | Location | Rule |
|---|---|---|
| Engine (pure TS) | `src/lib/dsl/`, `src/lib/layout/` | **Zero** React/DOM — runs in worker, main thread, Node |
| Web Worker | `src/workers/pipeline.worker.ts` | Client-only; debounce + stale-request guard |
| Sync pipeline | `src/lib/dsl/run-pipeline-sync.ts` | Main-thread previews for docs embeds |
| Stores | `src/lib/store/` | Single source of truth, 5 stores |
| UI | `src/components/` | Thin window over stores + engine |

## Stores

| Store | File | Owns |
|---|---|---|
| `useWorkspaceStore` | `workspace-store.ts` | viewMode, activeTab, fileName, panel toggles |
| `useDiagramStore` | `diagram-store.ts` | source, nodes/edges, nodeOverrides, errors, status |
| `useDiagramRegistry` | `diagram-registry.ts` | saved diagrams CRUD, active diagram id |
| `useDiagramLibraryStore` | `diagram-library-store.ts` | derived list view over registry |
| `useWhiteboardStore` | `whiteboard-store.ts` | elements, tool/color, undo/redo history |

## Where Things Render

| Thing | File |
|---|---|
| Flowchart | `components/editor/FlowchartCanvas.tsx` |
| Sequence diagram | `components/editor/SequenceDiagramCanvas.tsx` |
| Whiteboard | `components/whiteboard/WhiteboardCanvas.tsx` |
| Docs embeds | `components/docs/DiagramPreview.tsx` |
