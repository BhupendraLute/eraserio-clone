# Project Status — Quick Reference

> 📚 **Docs index + feature tour:** [`Documentation/index.md`](../Documentation/index.md) · [`Documentation/01-getting-started.md`](../Documentation/01-getting-started.md)

## Delivery Slices

| Slice | Name | Status |
|---|---|---|
| 1 | Diagram-as-Code Engine (Flowcharts + Sequence) | **DONE** (v0.2.0) |
| 2 | Markdown Docs Editor + Embedded Diagrams | **DONE** (v0.3.0) |
| 3 | Freeform Whiteboard + Eraser.io UI Clone | **DONE** (v0.5.0) |
| 4 | Auth, Database & Persistence | **DONE** (NextAuth OAuth + Neon/Prisma + document API + share + guest doc migration + preferences + export + Danger Zone + workspace teams) |
| 5 | AI Diagram Generation (Prompt → DSL) | PLANNED |
| 6 | Real-Time Multiplayer (Yjs CRDTs) | PLANNED |
| 7 | Integrations & Public API | PLANNED |

## Highlight Features

| Area | Highlights |
|---|---|
| **Diagram-as-Code** | Flowchart + sequence DSL · Dagre layout · CodeMirror highlighting/lint · worker pipeline · node drag overrides · SVG/PNG export |
| **Docs** | Tiptap + `DiagramEmbed` node · sync previews · diagram library CRUD · slash commands |
| **Whiteboard** | shapes/arrows/pencil/text/icons/comments · marquee + resize · orthogonal routing · view switcher · insert catalog · undo/redo · keyboard shortcuts |
| **Auth & Cloud** | NextAuth OAuth (GitHub/Google) · JWT sessions · Neon/Prisma persistence · cloud/offline modes · public share links · auth-scoped API + zod validation · sync status UI · profile settings (name/avatar edit + reset to provider) · guest-to-cloud doc migration with localStorage purge · editor preferences (grid patterns, export scale) · JSON data export · Danger Zone account deletion · Workspace team creation & role invites |

## Test Coverage

| Area | Statements | Functions | Suites (`tests/`) |
|---|---|---|---|
| `dsl` | 95.96% | 96% | lexer, parser, AST, validator, error-messages, run-pipeline-sync, codemirror-language, codemirror-lint |
| `layout` | 97.54% | 94.44% | dagre-adapter, sequence-layout, text-measure, wrap-text |
| `render` | 98.87% | 100% | orthogonal-routing, edge-geometry, node-style, text-style |
| `export` | 97.33% | 93.75% | svg-export |
| `store` | 88.68% | 88.95% | workspace-store, diagram-store, diagram-registry, diagram-library-store, whiteboard-store, document-store, preferences-store, ai-chat-store |
| **All files** | **91.31%** | **90.46%** | **437 tests / 30 test files (100% passing)** |

> Thresholds enforced: **70% stmts / 60% branches / 75% funcs / 75% lines** — the command fails on regression.

## Next Up (Slices 5–7 & Dashboard Phase 2)

- [x] **Dashboard Team Folder CRUD**: Create, rename, color-code, and delete folders with document re-association
- [x] **Document Batch Actions**: Multi-select bulk archive, move-to-folder, and cascade deletion
- [x] **Workspace Team Switcher & Invites Modal**: Team member invitation flow with role permissions (Owner, Admin, Member, Viewer)
- [x] **Skeleton UI Suite**: Shimmer loading states for folders, table view, and grid view
- [x] **ACID Compliance & Metadata Cache**: Persistent local document metadata (`eraserio_doc_meta`) for reliable archive tab retention
- [ ] **Eraser MCP Connection Guide**: Setup guide & server integration modal for Cursor/Claude/Antigravity
- [ ] **Architecture Templates Catalog**: Gallery of pre-built starter diagrams (AWS, microservices, sequence, ERD)
- [ ] **Custom Styles Editor**: Canvas styling tokens, custom theme presets, and export defaults
- [ ] **LLM → DSL Generation**: AI diagram prompt generator refinement
- [ ] **Real-Time Multiplayer**: Yjs/Automerge CRDT multiplayer collaboration
- [ ] **Integrations**: GitHub App, REST API, Notion/Confluence sync

