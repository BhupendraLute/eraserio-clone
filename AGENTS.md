<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Eraser.io Clone — Agent Context Index

**Stack**: Next.js 16 · React 19 · TailwindCSS v4 · shadcn/ui · Chevrotain · Dagre · Zustand · CodeMirror 6 · Tiptap

## ⚡ Primary Documentation — READ FIRST

> 📚 **Full developer documentation lives in [`Documentation/`](Documentation/index.md).**
> Start there for deep, beginner-friendly guides with mermaid diagrams, code snippets, and
> per-feature explanations. The `.agents/` files below are **condensed quick-reference summaries**
> only — when you need details, follow the links below to the full docs.

| Read this first | When you need... |
|---|---|
| [`Documentation/index.md`](Documentation/index.md) | The full documentation index & quickstart |
| [`Documentation/02-architecture-overview.md`](Documentation/02-architecture-overview.md) | System topology, tech stack, module boundaries |
| [`Documentation/03-project-structure.md`](Documentation/03-project-structure.md) | Annotated folder tree & "where is X" table |
| [`Documentation/06-state-management.md`](Documentation/06-state-management.md) | All 5 Zustand stores in detail |
| [`Documentation/07-dsl-engine.md`](Documentation/07-dsl-engine.md) | DSL lexer → parser → AST → validator |
| [`Documentation/08-worker-pipeline.md`](Documentation/08-worker-pipeline.md) | Web Worker pipeline + `usePipelineWorker` |
| [`Documentation/14-whiteboard-core.md`](Documentation/14-whiteboard-core.md) | Whiteboard store & element types |
| [`Documentation/20-data-flows.md`](Documentation/20-data-flows.md) | End-to-end sequence diagrams of key flows |
| [`Documentation/21-development-guide.md`](Documentation/21-development-guide.md) | Golden rules, verification commands, pitfalls |

## Context Files (`.agents/`) — Condensed Summaries

| File | Contents | Full docs |
|---|---|---|
| [`architecture.md`](.agents/architecture.md) | System topology, tech stack, module boundaries, state stores, file structure | [02-architecture-overview.md](Documentation/02-architecture-overview.md) · [03-project-structure.md](Documentation/03-project-structure.md) |
| [`dataflows.md`](.agents/dataflows.md) | Sequence diagrams for pipeline, embeds, node drag, whiteboard creation, export | [20-data-flows.md](Documentation/20-data-flows.md) |
| [`dev-rules.md`](.agents/dev-rules.md) | Engine isolation, worker rules, SSR safety, export safety, theme colors, build commands | [21-development-guide.md](Documentation/21-development-guide.md) |
| [`project-status.md`](.agents/project-status.md) | Delivery slices, feature inventory, roadmap | [01-getting-started.md](Documentation/01-getting-started.md) · [index.md](Documentation/index.md) |

## Quick Rules for Agents

- **Pure TS Core**: `src/lib/dsl/` and `src/lib/layout/` have zero React/DOM dependencies.
- **Worker Reload**: Editing files imported by `pipeline.worker.ts` requires restarting `npm run dev`.
- **Export Safety**: No SVG `<foreignObject>` — use static SVG paths (`NodeIcon.tsx`).
- **Theme Colors**: Use `text-foreground/50` + `stroke="currentColor"`. No hardcoded colors.
- **Navigation**: Use Next.js `Link` for client routing. No `<a href>`.
