# Project Status — Quick Reference

> 📚 **Docs index + feature tour:** [`Documentation/index.md`](../Documentation/index.md) · [`Documentation/01-getting-started.md`](../Documentation/01-getting-started.md)

## Delivery Slices

| Slice | Name | Status |
|---|---|---|
| 1 | Diagram-as-Code Engine (Flowcharts + Sequence) | **DONE** (v0.2.0) |
| 2 | Markdown Docs Editor + Embedded Diagrams | **DONE** (v0.3.0) |
| 3 | Freeform Whiteboard + Eraser.io UI Clone | **DONE** (v0.5.0) |
| 4 | Auth, Database & Persistence | PLANNED |
| 5 | AI Diagram Generation (Prompt → DSL) | PLANNED |
| 6 | Real-Time Multiplayer (Yjs CRDTs) | PLANNED |
| 7 | Integrations & Public API | PLANNED |

## Highlight Features

| Area | Highlights |
|---|---|
| **Diagram-as-Code** | Flowchart + sequence DSL · Dagre layout · CodeMirror highlighting/lint · worker pipeline · node drag overrides · SVG/PNG export |
| **Docs** | Tiptap + `DiagramEmbed` node · sync previews · diagram library CRUD · slash commands |
| **Whiteboard** | shapes/arrows/pencil/text/icons/comments · marquee + resize · orthogonal routing · view switcher · insert catalog · undo/redo · keyboard shortcuts |

## Test Coverage

| Area | Statements | Functions | Suites (`tests/`) |
|---|---|---|---|
| `dsl` | 95.98% | 96% | lexer, parser, AST, validator, error-messages, run-pipeline-sync, codemirror-language, codemirror-lint |
| `layout` | 97.41% | 93.75% | dagre-adapter, sequence-layout, text-measure, wrap-text |
| `render` | 94.25% | 87.5% | orthogonal-routing, edge-geometry |
| `export` | 97.33% | 93.75% | svg-export |
| `store` | 78.33% | 87.37% | workspace-store, diagram-store, diagram-registry, diagram-library-store, whiteboard-store |
| **All files** | **86.47%** | **89.52%** | **258 tests / 20 files** |

> Run `npm run test:coverage` for live numbers (commands + conventions: `.agents/dev-rules.md` → Testing).
> Thresholds enforced: **70% stmts / 60% branches / 75% funcs / 75% lines** — the command fails on regression.
> `diagram-store.ts` is at 100%; `store` has the lowest branch coverage (53.86% — undo/redo paths).

## Next Up (Slices 4–7)

PostgreSQL + Supabase/Clerk auth & persistence · LLM → DSL generation · Yjs/Automerge multiplayer · GitHub App, REST API, Notion/Confluence sync, PDF export
