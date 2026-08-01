# Architecture — Quick Reference

> 📚 **Full docs:** [`Documentation/02-architecture-overview.md`](../Documentation/02-architecture-overview.md) · [`Documentation/03-project-structure.md`](../Documentation/03-project-structure.md)

## Stack at a Glance

| Tech | Role |
|---|---|
| Next.js 16 (App Router) | Routing, SSR, React Compiler, Proxy (middleware) |
| React 19 | UI components & hooks |
| TailwindCSS v4 + shadcn/ui | Styling + accessible primitives |
| Chevrotain | DSL tokenizer & parser |
| Dagre | Flowchart auto-layout |
| CodeMirror 6 | DSL editor + syntax highlighting + lint |
| Tiptap (ProseMirror) | Docs editor + diagram embed nodes |
| Zustand v5 | Global state (6 stores) |
| React Query | Icon search query cache |
| **NextAuth.js v4** | OAuth (GitHub/Google) + JWT sessions (Slice 4) |
| **Prisma 7 + Neon Postgres** | Cloud persistence via `PrismaPg`/`pg` driver adapter (Slice 4) |

## Layers

| Layer | Location | Rule |
|---|---|---|
| Engine (pure TS) | `src/lib/dsl/`, `src/lib/layout/` | **Zero** React/DOM — runs in worker, main thread, Node |
| Web Worker | `src/workers/pipeline.worker.ts` | Client-only; debounce + stale-request guard |
| Sync pipeline | `src/lib/dsl/run-pipeline-sync.ts` | Main-thread previews for docs embeds |
| Auth | `src/lib/auth.ts`, `src/lib/auth/session.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts` | NextAuth config + `getUserId()` server helper; JWT sessions |
| Database | `src/lib/db/prisma.ts`, `prisma/schema.prisma` | PrismaClient + PrismaPg/pg Pool (Neon); `User/Account/Document/...` |
| API | `src/app/api/documents/**` | Auth-scoped CRUD + share; zod validation (`src/lib/api-validation.ts`) |
| Stores | `src/lib/store/` | Single source of truth, **6 stores** (incl. auth-aware `document-store`) |
| UI | `src/components/` | Thin window over stores + engine |
| Tests | `tests/` | Vitest suites mirroring `src/` (commands + conventions: dev-rules → Testing) |

## Stores

| Store | File | Owns |
|---|---|---|
| `useWorkspaceStore` | `workspace-store.ts` | viewMode, activeTab, fileName, panel toggles |
| `useDiagramStore` | `diagram-store.ts` | source, nodes/edges, nodeOverrides, errors, status |
| `useDiagramRegistry` | `diagram-registry.ts` | saved diagrams CRUD, active diagram id |
| `useDiagramLibraryStore` | `diagram-library-store.ts` | derived list view over registry |
| `useWhiteboardStore` | `whiteboard-store.ts` | elements, tool/color, undo/redo history |
| `useDocumentStore` | `document-store.ts` | documents, active doc, syncStatus, mode (cloud/offline), authStatus, share |

## Where Things Render

| Thing | File |
|---|---|
| Flowchart | `components/editor/FlowchartCanvas.tsx` |
| Sequence diagram | `components/editor/SequenceDiagramCanvas.tsx` |
| Whiteboard | `components/whiteboard/WhiteboardCanvas.tsx` |
| Docs embeds | `components/docs/DiagramPreview.tsx` |
| Auth modal / avatar | `components/auth/AuthModal.tsx`, `components/auth/UserNav.tsx` |
| Sync status | `components/workspace/SyncStatusBadge.tsx` (header badge + avatar menu) |

> 📚 **Auth & persistence details:** [`Documentation/24-authentication-and-database.md`](../Documentation/24-authentication-and-database.md)
