# Data Flows — Quick Reference

> 📚 **Full docs (mermaid diagrams):** [`Documentation/20-data-flows.md`](../Documentation/20-data-flows.md)

## Flows at a Glance

| Flow | Essence |
|---|---|
| **Keystroke → Canvas** | CodeMirror → `diagram-store.setSource` → `usePipelineWorker` debounce (200ms) → worker: lex → parse → ast → validate → layout → stale-guard id check → `applyResult`/`setErrors` → `pushDiagnostics` |
| **Docs embed** | Toolbar → `insertDiagramEmbed` → `DiagramEmbedView` → picker → `updateAttributes(diagramId)` → `runPipelineSync` → read-only SVG |
| **Node drag override** | `setNodePosition(id,x,y)` → `nodeOverrides` → edges fall back to `straightEdgePath`; double-click → `resetNodePosition` |
| **Whiteboard draw** | `setActiveTool` → pointerdown/up → bbox → `addElement` → pushHistory + debounced saveElements |
| **Arrow connect** | `findNearestShapePort` → `getOptimalPortPair` → store from/to element + ports; re-routed on move/resize |
| **SVG/PNG export** | clone → `inlineComputedColors` → strip transform → set viewBox → white bg rect → serialize → download |
| **Undo/redo** | mutating actions push history(prev) + clear future; undo/redo swap stacks |

## Key Facts

- Worker debounce: **200ms**; stale responses dropped via `id !== latestSentId`.
- History cap: **100** entries.
- Whiteboard persistence: `localStorage` key `eraser-whiteboard-elements`, debounced **300ms**.
- `moveSelectedElements` / `resizeElement` do **not** push history (a pure drag never records its own undo entry).
